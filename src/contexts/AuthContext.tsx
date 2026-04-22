import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db, googleProvider, getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateEmail,
  updatePassword,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, writeBatch, limit, increment } from 'firebase/firestore';
import { sendPushNotification } from '../lib/notifications';
import { awardPoints } from '../services/gamificationService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bannerURL?: string;
  bio?: string;
  location?: string;
  website?: string;
  category?: string;
  following?: string[];
  followers?: string[];
  mutedUsers?: string[];
  blockedUsers?: string[];
  bookmarks?: string[];
  pinnedPostIds?: string[];
  mutedWords?: string[];
  isVerified?: boolean;
  isCreator?: boolean;
  creatorCategory?: string;
  monetizationEnabled?: boolean;
  isPremium?: boolean;
  premiumTier?: 'silver' | 'gold' | 'black';
  points?: number;
  level?: number;
  badges?: string[];
  circleMembers?: string[];
  createdAt?: any;
  privateProfile?: boolean;
  sensitiveContent?: boolean;
  discoverability?: boolean;
  directMessages?: 'everyone' | 'following' | 'none';
  streakCount?: number;
  lastLoginAt?: any;
  inventory?: string[];
  completedMissionIds?: string[];
  missionProgress?: Record<string, number>;
  violations?: {
    id: string;
    reason: string;
    date: any;
    severity: 'low' | 'medium' | 'high';
    type: string;
  }[];
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, appVerifier: any) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, username: string, name: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string, remember?: boolean) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  updateUserUsername: (username: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  followUser: (targetUid: string) => Promise<void>;
  unfollowUser: (targetUid: string) => Promise<void>;
  addToCircle: (targetUid: string) => Promise<void>;
  removeFromCircle: (targetUid: string) => Promise<void>;
  muteUser: (targetUid: string) => Promise<void>;
  unmuteUser: (targetUid: string) => Promise<void>;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  unbookmarkPost: (postId: string) => Promise<void>;
  pinPost: (postId: string) => Promise<void>;
  unpinPost: (postId: string) => Promise<void>;
  addMutedWord: (word: string) => Promise<void>;
  removeMutedWord: (word: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  enableCreatorMode: (category: string) => Promise<void>;
  sendFollowRequest: (targetUid: string) => Promise<void>;
  cancelFollowRequest: (targetUid: string) => Promise<void>;
  acceptFollowRequest: (requestId: string) => Promise<void>;
  declineFollowRequest: (requestId: string) => Promise<void>;
  reportContent: (type: 'post' | 'user' | 'comment', targetId: string, reason: string, details?: string) => Promise<void>;
  requestVerification: (reason: string, category: string, documentUrl?: string) => Promise<void>;
  trackImpression: (postId: string) => Promise<void>;
  trackProfileView: (targetUid: string) => Promise<void>;
  sendChatMessage: (conversationId: string, text: string, imageUrl?: string, audioUrl?: string) => Promise<void>;
  setTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
  purchaseItem: (itemId: string, cost: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const migrationDoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    let unsubscribeProfile: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Just setup listeners and basic stuff, don't request permission yet
        const setupForegroundMessaging = async () => {
          try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              const messaging = await getMessagingInstance();
              if (!messaging) return;

              onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
              });
            }
          } catch (error) {
            console.error('Error setup foreground messaging:', error);
          }
        };

        setupForegroundMessaging();

        const docRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            
            // Handle Streak Tracking
            const now = new Date();
            const lastLogin = profileData.lastLoginAt?.toDate();
            
            if (!lastLogin) {
              await updateDoc(docRef, { 
                lastLoginAt: serverTimestamp(),
                streakCount: 1 
              });
            } else {
              const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              if (diffDays >= 1 && diffDays < 2) {
                // Consecutive day
                await updateDoc(docRef, { 
                  lastLoginAt: serverTimestamp(),
                  streakCount: (profileData.streakCount || 0) + 1,
                  completedMissionIds: [], // Reset missions for new day
                  missionProgress: {}       // Reset progress for new day
                });
                await awardPoints(user.uid, 50 * ((profileData.streakCount || 1)));
              } else if (diffDays >= 2) {
                // Streak broken
                await updateDoc(docRef, { 
                  lastLoginAt: serverTimestamp(),
                  streakCount: 1,
                  completedMissionIds: [], // Reset missions for new day
                  missionProgress: {}       // Reset progress for new day
                });
              } else if (diffDays < 1 && now.getDate() !== lastLogin.getDate()) {
                // Same day but different calendar day (e.g. 11pm and 1am)
                await updateDoc(docRef, { 
                  lastLoginAt: serverTimestamp(),
                  streakCount: (profileData.streakCount || 0) + 1,
                  completedMissionIds: [], // Reset missions for new day
                  missionProgress: {}       // Reset progress for new day
                });
                await awardPoints(user.uid, 50);
              }
            }

            setUserProfile(profileData);

              // Migration for legacy posts - run once per user session
              if (migrationDoneRef.current !== user.uid && !(profileData as any).migrationDone) {
                migrationDoneRef.current = user.uid;
                const migrateLegacyPosts = async () => {
                  try {
                    const q = query(
                      collection(db, 'posts'),
                      where('authorId', '==', user.uid),
                      limit(50)
                    );
                    const snapshot = await getDocs(q);
                    const legacyDocs = snapshot.docs.filter(d => !d.data().privacy);
                    
                    if (legacyDocs.length === 0) {
                      await updateDoc(docRef, { migrationDone: true });
                      return;
                    }

                    const batch = writeBatch(db);
                    legacyDocs.forEach(postDoc => {
                      batch.update(postDoc.ref, { privacy: 'public' });
                    });
                    
                    batch.update(docRef, { migrationDone: true });
                    await batch.commit();
                    console.log(`Migrated ${legacyDocs.length} legacy posts and set migration flag for user ${user.uid}`);
                  } catch (migrateError) {
                    console.error("Migration error:", migrateError);
                    migrationDoneRef.current = null;
                  }
                };
                migrateLegacyPosts();
              }
          } else {
            // Fallback if profile doesn't exist yet
            setUserProfile({
              uid: user.uid,
              email: user.email || '',
              username: user.email?.split('@')[0] || 'user',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              following: [],
              followers: []
            });
          }
          setLoading(false);
        }, (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Administrative moderation cleanup logic
  useEffect(() => {
    if (currentUser?.email === 'klypsocialofficial@gmail.com') {
      const runModerationCleanup = async () => {
        const cleanupKey = 'moderation_cleanup_executed_20260420_v4';
        if (localStorage.getItem(cleanupKey)) return;

        console.log("Iniciando limpeza administrativa de moderação...");
        try {
          // 1. Remover perfis específicos (Alisson Wachholz, Alisson do rúlio, etc)
          const targetIdentifiers = [
            'Alissom', 
            '@Alissom', 
            'Alisson do rúlio', 
            'Alisson do rulio', 
            '@Alisson do rúlio', 
            '@Alisson do rulio',
            'Alisson Wachholz',
            'AlissonWachholz'
          ];
          
          for (const ident of targetIdentifiers) {
            // Busca por username
            const qUname = query(collection(db, 'users'), where('username', '==', ident), limit(5));
            const snapUname = await getDocs(qUname);
            
            // Busca por display name
            const qDisplay = query(collection(db, 'users'), where('displayName', '==', ident), limit(5));
            const snapDisplay = await getDocs(qDisplay);

            const allDocs = [...snapUname.docs, ...snapDisplay.docs];
            
            if (allDocs.length > 0) {
              console.log(`Alvo encontrado: ${ident}. Processando exclusão...`);
              
              for (const userDoc of allDocs) {
                const uid = userDoc.id;
                
                // Deletar posts do usuário
                const postsQ = query(collection(db, 'posts'), where('authorId', '==', uid));
                const postsSnap = await getDocs(postsQ);
                if (!postsSnap.empty) {
                  const chunks = [];
                  for (let i = 0; i < postsSnap.docs.length; i += 500) {
                    chunks.push(postsSnap.docs.slice(i, i + 500));
                  }
                  for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                  }
                }

                // Deletar perfil
                await deleteDoc(userDoc.ref);
                console.log(`Perfil e posts de ${ident} (${uid}) foram removidos com sucesso.`);
              }
            }
          }

          // 2. Limpar qualquer post anônimo remanescente ou configurado incorretamente
          const anonQ = query(collection(db, 'posts'), where('authorId', '==', 'anonymous'), limit(500));
          const anonSnap = await getDocs(anonQ);
          if (!anonSnap.empty) {
            const anonBatch = writeBatch(db);
            anonSnap.forEach(d => anonBatch.delete(d.ref));
            await anonBatch.commit();
            console.log("Posts anônimos limpos.");
          }

          localStorage.setItem(cleanupKey, 'true');
          console.log("Processo de moderação concluído.");
        } catch (error) {
          console.error("Erro na limpeza de moderação:", error);
        }
      };

      runModerationCleanup();
    }
  }, [currentUser]);

  const loginWithPhone = async (phoneNumber: string, appVerifier: any) => {
    if (!auth) throw new Error("Firebase not initialized");
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    
    // Check if user exists in db
    const docRef = doc(db, 'users', user.uid);
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (error) {
      console.error("Error fetching user profile after Phone login:", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      return;
    }
    
    if (!docSnap.exists()) {
      // Create new user profile for phone user
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        username: 'user_' + Math.floor(Math.random() * 1000000),
        displayName: 'User',
        photoURL: '',
        following: [],
        followers: [],
        createdAt: serverTimestamp()
      };
      try {
        await setDoc(docRef, newProfile);
      } catch (error) {
        console.error("Error creating user profile after Phone login:", error);
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
      setUserProfile(newProfile);
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth?.currentUser) throw new Error("No user logged in");
    await sendEmailVerification(auth.currentUser);
  };

  const loginWithGoogle = async () => {
    try {
      if (!auth) throw new Error("Firebase not initialized");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in db
      const docRef = doc(db, 'users', user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error) {
        console.error("Error fetching user profile after Google login:", error);
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        return;
      }
      
      if (!docSnap.exists()) {
        // Create new user profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          username: user.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + Math.floor(Math.random() * 1000) || 'user_' + Math.floor(Math.random() * 1000),
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          following: [],
          followers: [],
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(docRef, newProfile);
        } catch (error) {
          console.error("Error creating user profile after Google login:", error);
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
        setUserProfile(newProfile);
      }
    } catch (error: any) {
      console.error("Full Google Login Error Object:", error);
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error("O login com Google não está ativado no Firebase Console.");
      }
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error("Este domínio não está autorizado no Firebase Console. Por favor, adicione '" + window.location.hostname + "' aos domínios autorizados.");
      }
      if (error.code === 'auth/invalid-api-key') {
        throw new Error("A chave de API do Firebase é inválida. Verifique sua configuração.");
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, username: string, name: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    
    // Check if username is taken
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("Este nome de usuário já está em uso.");
    }

    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const user = result.user;
    
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      username: username,
      displayName: name,
      photoURL: '',
      following: [],
      followers: [],
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
    setUserProfile(newProfile);
  };

  const loginWithEmail = async (email: string, pass: string, remember: boolean = true) => {
    if (!auth) throw new Error("Firebase not initialized");
    const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const updateUserEmail = async (email: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    await updateEmail(auth.currentUser, email);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { email });
  };

  const updateUserPassword = async (password: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    await updatePassword(auth.currentUser, password);
  };

  const updateUserUsername = async (username: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    
    // Check if username is taken
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty && snapshot.docs[0].id !== auth.currentUser.uid) {
      throw new Error("Username already taken");
    }

    await updateDoc(doc(db, 'users', auth.currentUser.uid), { username });
  };

  const deleteAccount = async () => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    const user = auth.currentUser;
    const uid = user.uid;

    try {
      const batch = writeBatch(db);

      // 1. Delete user document from Firestore
      batch.delete(doc(db, 'users', uid));

      // 2. Delete posts by user
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', uid));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete notifications
      const notifsQueryRecipient = query(collection(db, 'notifications'), where('recipientId', '==', uid));
      const notifsSnapshotRecipient = await getDocs(notifsQueryRecipient);
      notifsSnapshotRecipient.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const notifsQuerySender = query(collection(db, 'notifications'), where('senderId', '==', uid));
      const notifsSnapshotSender = await getDocs(notifsQuerySender);
      notifsSnapshotSender.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Commit batch
      await batch.commit();
      
      // 4. Delete user from Firebase Auth
      await deleteUser(user);
      
      // 5. Clear local state
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw error;
      }
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const logout = () => {
    if (!auth) throw new Error("Firebase not initialized");
    return signOut(auth);
  };

  const followUser = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");
    
    // Check private status
    const targetUserRef = doc(db, 'users', targetUid);
    const targetSnap = await getDoc(targetUserRef);
    if (!targetSnap.exists()) throw new Error("User not found");
    const targetProfile = targetSnap.data() as UserProfile;

    if (targetProfile.privateProfile) {
        await sendFollowRequest(targetUid);
        return;
    }

    if (userProfile.uid === targetUid) throw new Error("You cannot follow yourself");

    const currentUserRef = doc(db, 'users', currentUser.uid);

    try {
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUid)
      });
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUser.uid)
      });
      // Award points for following and track mission
      await awardPoints(currentUser.uid, 5, 'follow');

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUid,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderUsername: userProfile.username,
        senderPhoto: userProfile.photoURL || null,
        senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
        senderPremiumTier: userProfile.premiumTier || null,
        type: 'follow',
        read: false,
        createdAt: serverTimestamp()
      });

      // Trigger push notification
      await sendPushNotification(
        targetUid,
        'Novo Seguidor',
        `${userProfile.displayName} começou a seguir você.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const sendFollowRequest = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");
    
    const q = query(
      collection(db, 'followRequests'),
      where('senderId', '==', currentUser.uid),
      where('receiverId', '==', targetUid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Request already sent");

    const reqDoc = await addDoc(collection(db, 'followRequests'), {
      senderId: currentUser.uid,
      receiverId: targetUid,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Create notification for the receiver
    await addDoc(collection(db, 'notifications'), {
      recipientId: targetUid,
      senderId: userProfile.uid,
      senderName: userProfile.displayName,
      senderUsername: userProfile.username,
      senderPhoto: userProfile.photoURL || null,
      senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
      senderPremiumTier: userProfile.premiumTier || null,
      type: 'follow_request',
      followRequestId: reqDoc.id,
      read: false,
      createdAt: serverTimestamp()
    });

    // Trigger push notification
    await sendPushNotification(
      targetUid,
      'Solicitação para seguir',
      `${userProfile.displayName} quer seguir você.`
    );
  };

  const cancelFollowRequest = async (targetUid: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const q = query(
      collection(db, 'followRequests'),
      where('senderId', '==', currentUser.uid),
      where('receiverId', '==', targetUid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      
      // Also delete the notification if possible
      const qNotif = query(
        collection(db, 'notifications'),
        where('senderId', '==', currentUser.uid),
        where('recipientId', '==', targetUid),
        where('type', '==', 'follow_request')
      );
      const snapNotif = await getDocs(qNotif);
      snapNotif.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
    }
  };

  const acceptFollowRequest = async (requestId: string) => {
     if (!userProfile || !currentUser) throw new Error("User not authenticated");
     const reqRef = doc(db, 'followRequests', requestId);
     const reqSnap = await getDoc(reqRef);
     if (!reqSnap.exists()) throw new Error("Request not found");
     const data = reqSnap.data();

     // Atomic update: accept request, add follower
     const batch = writeBatch(db);
     batch.update(reqRef, { status: 'accepted' });
     batch.update(doc(db, 'users', data.senderId), {
         following: arrayUnion(data.receiverId)
     });
     batch.update(doc(db, 'users', data.receiverId), {
         followers: arrayUnion(data.senderId)
     });
     
     // Delete the follow_request notification
     const qNotif = query(
       collection(db, 'notifications'),
       where('followRequestId', '==', requestId)
     );
     const snapNotif = await getDocs(qNotif);
     snapNotif.forEach(d => batch.delete(d.ref));

     await batch.commit();

     // Create success notification for the sender
     await addDoc(collection(db, 'notifications'), {
       recipientId: data.senderId,
       senderId: userProfile.uid,
       senderName: userProfile.displayName,
       senderUsername: userProfile.username,
       senderPhoto: userProfile.photoURL || null,
       senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
       senderPremiumTier: userProfile.premiumTier || null,
       type: 'follow', // Now they are following!
       read: false,
       createdAt: serverTimestamp()
     });

     // Trigger push notification
     await sendPushNotification(
       data.senderId,
       'Solicitação aceita',
       `${userProfile.displayName} aceitou sua solicitação para seguir.`
     );
  };

  const declineFollowRequest = async (requestId: string) => {
      if (!currentUser) throw new Error("User not authenticated");
      const reqRef = doc(db, 'followRequests', requestId);
      const batch = writeBatch(db);
      batch.update(reqRef, { status: 'declined' });
      
      // Delete the follow_request notification
      const qNotif = query(
        collection(db, 'notifications'),
        where('followRequestId', '==', requestId)
      );
      const snapNotif = await getDocs(qNotif);
      snapNotif.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
  };

  const reportContent = async (type: 'post' | 'user' | 'comment', targetId: string, reason: string, details?: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        targetType: type,
        targetId: targetId,
        reason: reason,
        details: details || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const requestVerification = async (reason: string, category: string, documentUrl?: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    try {
      await addDoc(collection(db, 'verificationRequests'), {
        uid: currentUser.uid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        category,
        reason,
        documentUrl: documentUrl || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'verificationRequests');
    }
  };

  const trackImpression = async (postId: string) => {
    if (!db) return;
    try {
      const postRef = doc(db, 'posts', postId);
      // We use a separate collection for better analytics, but for simple stats we increment
      await updateDoc(postRef, {
        viewCount: ( ( (await getDoc(postRef)).data() as any )?.viewCount || 0 ) + 1
      });
      
      // Also log to a daily analytics doc for the creator
      // This is background work
    } catch (error) {
      // Silently fail for tracking
    }
  };

  const trackProfileView = async (targetUid: string) => {
    if (!db || !currentUser || currentUser.uid === targetUid) return;
    try {
      const userRef = doc(db, 'users', targetUid);
      // Increment profile views
      const dailyId = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, 'users', targetUid, 'analytics', dailyId);
      
      const snap = await getDoc(analyticsRef);
      if (snap.exists()) {
        await updateDoc(analyticsRef, { views: (snap.data().views || 0) + 1 });
      } else {
        await setDoc(analyticsRef, { views: 1, date: dailyId }, { merge: true });
      }
    } catch (error) {
      // Silently fail
    }
  };

  const sendChatMessage = async (conversationId: string, text: string, imageUrl?: string, audioUrl?: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    try {
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return;
      
      const convData = convSnap.data();
      const batch = writeBatch(db);
      
      // Streak Logic
      const now = new Date();
      const lastStreakAt = convData.lastStreakAt?.toDate();
      let newStreakCount = convData.streakCount || 0;
      let shouldUpdateStreak = false;

      if (!lastStreakAt) {
        newStreakCount = 1;
        shouldUpdateStreak = true;
      } else {
        const diffTime = Math.abs(now.getTime() - lastStreakAt.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays >= 1 && diffDays < 2) {
          // Consecutive day
          newStreakCount += 1;
          shouldUpdateStreak = true;
        } else if (diffDays >= 2) {
          // Streak broken
          newStreakCount = 1;
          shouldUpdateStreak = true;
        }
      }

      const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      batch.set(msgRef, {
        senderId: currentUser.uid,
        text,
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        createdAt: serverTimestamp(),
        read: false
      });
      
      const otherId = convData.participants.find((id: string) => id !== currentUser.uid);
      
      const updateData: any = {
        lastMessage: audioUrl ? '🎤 Áudio' : imageUrl ? '📷 Foto' : text,
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      };

      if (shouldUpdateStreak) {
        updateData.streakCount = newStreakCount;
        updateData.lastStreakAt = serverTimestamp();
      } else if (!lastStreakAt) {
        updateData.streakCount = 1;
        updateData.lastStreakAt = serverTimestamp();
      }

      batch.update(convRef, updateData);
      
      await batch.commit();
      
      // Award points for chatting and track mission
      await awardPoints(currentUser.uid, 5, 'dm');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    }
  };

  const setTypingStatus = async (conversationId: string, isTyping: boolean) => {
    if (!currentUser) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`typing.${currentUser.uid}`]: isTyping
      });
    } catch (error) {
      // Silently fail
    }
  };

  const unfollowUser = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    try {
      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUid)
      });
      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUser.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const addToCircle = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    if (currentUser.uid === targetUid) throw new Error("You cannot add yourself to your circle");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        circleMembers: arrayUnion(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const removeFromCircle = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        circleMembers: arrayRemove(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const unmuteUser = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        mutedUsers: arrayRemove(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const muteUser = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        mutedUsers: arrayUnion(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const blockUser = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      // Blocking automatically unfollows
      const newFollowing = (userProfile.following || []).filter(id => id !== targetUid);
      
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(targetUid),
        following: newFollowing
      });

      // Also remove current user from target user's followers
      const targetUserRef = doc(db, 'users', targetUid);
      const targetSnap = await getDoc(targetUserRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const newFollowers = (targetData.followers || []).filter((id: string) => id !== currentUser.uid);
        await updateDoc(targetUserRef, {
          followers: newFollowers
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const unblockUser = async (targetUid: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const bookmarkPost = async (postId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        bookmarks: arrayUnion(postId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const unbookmarkPost = async (postId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        bookmarks: arrayRemove(postId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const pinPost = async (postId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        pinnedPostIds: arrayUnion(postId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const unpinPost = async (postId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        pinnedPostIds: arrayRemove(postId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const enableCreatorMode = async (category: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        isCreator: true,
        creatorCategory: category,
        monetizationEnabled: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const addMutedWord = async (word: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        mutedWords: arrayUnion(word.toLowerCase())
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const removeMutedWord = async (word: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        mutedWords: arrayRemove(word.toLowerCase())
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && currentUser) {
        const messaging = await getMessagingInstance();
        if (messaging && 'serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, {
            vapidKey: 'BFsixg_JwwMY4m3yMoZC9b-D4LIRsNcepSkQGkzCgBsnkdbGMmXdtjDCEbrgYYfSULAkTjo3WnPnHbXthoO69b0',
            serviceWorkerRegistration: registration
          });

          if (token) {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const purchaseItem = async (itemId: string, cost: number) => {
    if (!userProfile || !currentUser) throw new Error("Não autenticado");
    if ((userProfile.points || 0) < cost) throw new Error("Pontos insuficientes");

    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        points: (userProfile.points || 0) - cost,
        inventory: arrayUnion(itemId)
      });
      
      // Special logic for badges
      if (itemId.startsWith('badge_')) {
        await updateDoc(userRef, {
          badges: arrayUnion(itemId.replace('badge_', ''))
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    
    const updatePresence = async (status: 'online' | 'offline') => {
      try {
        await updateDoc(userRef, {
          onlineStatus: status,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        // Silently fail presence updates
      }
    };

    updatePresence('online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('offline');
      }
    };

    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      }
    }, 60000); // Every minute

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
      updatePresence('offline');
    };
  }, [currentUser, db]);

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    loginWithPhone,
    verifyPhoneCode,
    sendVerificationEmail,
    logout,
    signUpWithEmail,
    loginWithEmail,
    updateUserEmail,
    updateUserPassword,
    updateUserUsername,
    deleteAccount,
    followUser,
    unfollowUser,
    addToCircle,
    removeFromCircle,
    muteUser,
    unmuteUser,
    blockUser,
    unblockUser,
    bookmarkPost,
    unbookmarkPost,
    pinPost,
    unpinPost,
    addMutedWord,
    removeMutedWord,
    requestNotificationPermission,
    enableCreatorMode,
    sendFollowRequest,
    cancelFollowRequest,
    acceptFollowRequest,
    declineFollowRequest,
    reportContent,
    requestVerification,
    trackImpression,
    trackProfileView,
    sendChatMessage,
    setTypingStatus,
    purchaseItem
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
