import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc } from 'firebase/firestore';
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
  isPremium?: boolean;
  premiumTier?: 'silver' | 'gold' | 'black';
  points?: number;
  level?: number;
  badges?: string[];
  circleMembers?: string[];
  createdAt?: any;
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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    let unsubscribeProfile: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Request notification permission and save token
        const setupNotifications = async () => {
          try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              const messaging = await getMessagingInstance();
              if (!messaging) return;

              // Handle foreground messages
              onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
                // You could show a toast here if you want
              });

              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                // Wait for service worker to be ready
                if ('serviceWorker' in navigator) {
                  const registration = await navigator.serviceWorker.ready;
                  
                  const token = await getToken(messaging, {
                    vapidKey: 'BFsixg_JwwMY4m3yMoZC9b-D4LIRsNcepSkQGkzCgBsnkdbGMmXdtjDCEbrgYYfSULAkTjo3WnPnHbXthoO69b0',
                    serviceWorkerRegistration: registration
                  });

                  if (token) {
                    console.log('FCM Token retrieved:', token);
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      fcmTokens: arrayUnion(token)
                    }).catch(e => console.error('Error updating FCM token:', e));
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error registering for push notifications:', error);
          }
        };

        setupNotifications();

        const docRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
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
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
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

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
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
      // 1. Delete user document from Firestore
      await deleteDoc(doc(db, 'users', uid));
      
      // 2. Delete user from Firebase Auth
      await deleteUser(user);
      
      // 3. Clear local state
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
    if (userProfile.uid === targetUid) throw new Error("You cannot follow yourself");

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    try {
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUid)
      });
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUser.uid)
      });

      // Award points for following
      await awardPoints(currentUser.uid, 5);

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

  const unfollowUser = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    try {
      const newFollowing = (userProfile.following || []).filter(id => id !== targetUid);
      await updateDoc(currentUserRef, {
        following: newFollowing
      });

      const targetSnap = await getDoc(targetUserRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const newFollowers = (targetData.followers || []).filter((id: string) => id !== currentUser.uid);
        await updateDoc(targetUserRef, {
          followers: newFollowers
        });
      }
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
    removeMutedWord
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
