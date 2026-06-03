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
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, writeBatch, limit, increment } from 'firebase/firestore';
import { sendPushNotification } from '../lib/notifications';
import { awardPoints } from '../services/gamificationService';
import Toast from '../components/Toast';

export enum OperationType {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  twoFactorEnabled?: boolean;
  twoFactorPIN?: string;
  twoFactorBackupCodes?: string[];
  twoFactorCreatedAt?: any;
  streakCount?: number;
  lastLoginAt?: any;
  inventory?: string[];
  equippedFrame?: string;
  equippedTheme?: string;
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
  resetPassword: (email: string) => Promise<void>;
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
  equipItem: (itemId: string, category: 'frames' | 'themes') => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
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
  const streakCheckedRef = useRef<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    let unsubscribeProfile: () => void;
    let unsubscribeSession: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Setup session tracking
        let sessionId = localStorage.getItem('offme_session_id');
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('offme_session_id', sessionId);
        }

        const registerAndListenSession = async () => {
          try {
            const sessionDocRef = doc(db, 'users', user.uid, 'sessions', sessionId!);
            const sessionSnap = await getDoc(sessionDocRef);

            let ip = '189.120.45.10';
            let location = 'São Paulo, Brasil';

            try {
              const ipRes = await fetch('https://api.ipify.org?format=json');
              if (ipRes.ok) {
                const data = await ipRes.json();
                ip = data.ip || ip;
              }
            } catch (e) {}

            const ua = navigator.userAgent;
            let browser = 'Navegador';
            let os = 'Dispositivo';

            if (ua.indexOf('Chrome') > -1) browser = 'Google Chrome';
            else if (ua.indexOf('Safari') > -1) browser = 'Safari';
            else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
            else if (ua.indexOf('Edge') > -1) browser = 'Microsoft Edge';

            if (ua.indexOf('Windows') > -1) os = 'Windows PC';
            else if (ua.indexOf('Macintosh') > -1) os = 'macOS';
            else if (ua.indexOf('iPhone') > -1) os = 'iPhone';
            else if (ua.indexOf('Android') > -1) os = 'Android';
            else if (ua.indexOf('Linux') > -1) os = 'Linux';

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone.includes('Sao_Paulo')) location = 'São Paulo, Brasil';
            else if (timezone.includes('Rio_Janeiro')) location = 'Rio de Janeiro, Brasil';
            else if (timezone.includes('Fortaleza')) location = 'Fortaleza, Brasil';
            else if (timezone.includes('Manaus')) location = 'Manaus, Brasil';
            else if (timezone.includes('Brasilia')) location = 'Brasília, Brasil';
            else if (timezone.includes('Europe')) location = 'Europa';
            else location = 'Brasil';

            if (!sessionSnap.exists()) {
              await setDoc(sessionDocRef, {
                id: sessionId,
                browser,
                os,
                userAgent: ua,
                ip,
                location,
                loginAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                isCurrent: true
              });

              // Seed mock remote sessions for security demo if none exist
              const sessionsColl = collection(db, 'users', user.uid, 'sessions');
              const sessionsSnap = await getDocs(sessionsColl);
              if (sessionsSnap.size <= 1) {
                await setDoc(doc(db, 'users', user.uid, 'sessions', 'sess_mock1'), {
                  id: 'sess_mock1',
                  browser: 'Safari',
                  os: 'iPhone 15 Pro',
                  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                  ip: '177.39.144.120',
                  location: 'Rio de Janeiro, Brasil',
                  loginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                  lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
                  isCurrent: false
                });

                await setDoc(doc(db, 'users', user.uid, 'sessions', 'sess_mock2'), {
                  id: 'sess_mock2',
                  browser: 'Google Chrome',
                  os: 'Windows PC',
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                  ip: '201.86.54.91',
                  location: 'Porto Alegre, Brasil',
                  loginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                  lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                  isCurrent: false
                });
              }
            } else {
              await updateDoc(sessionDocRef, {
                lastActive: serverTimestamp()
              });
            }

            // Listen for revocation
            unsubscribeSession = onSnapshot(sessionDocRef, (snap) => {
              if (!snap.exists() && auth.currentUser) {
                console.log('Session was revoked remotely!');
                signOut(auth).then(() => {
                  localStorage.removeItem('offme_session_id');
                  setUserProfile(null);
                  setCurrentUser(null);
                  showToast('Sua sessão foi revogada remotamente por segurança.', 'info');
                });
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${user.uid}/sessions/${sessionId}`);
            });

          } catch (err: any) {
            console.error('Error establishing session tracking:', err);
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/sessions/${sessionId}`);
          }
        };

        registerAndListenSession();

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
            
            // Handle Streak Tracking (Run once per user session to completely prevent infinite updating loops)
            if (streakCheckedRef.current !== user.uid) {
              streakCheckedRef.current = user.uid;
              const handleStreakCheck = async () => {
                try {
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
                } catch (err) {
                  console.error("Streak check error:", err);
                }
              };
              handleStreakCheck();
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
        migrationDoneRef.current = null;
        streakCheckedRef.current = null;
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeSession) {
          try { unsubscribeSession(); } catch (e) {}
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSession) {
        try { unsubscribeSession(); } catch (e) {}
      }
    };
  }, []);

  const loginWithPhone = async (phoneNumber: string, appVerifier: any) => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      showToast("Código de verificação enviado via SMS!", "success");
      return result;
    } catch (error: any) {
      showToast("Erro ao enviar código SMS: " + (error.message || error), "error");
      throw error;
    }
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
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
      showToast("Verificação realizada com sucesso! Bem-vindo(a)!", "success");
    } catch (error: any) {
      showToast("Código inválido ou expirado. Tente novamente.", "error");
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth?.currentUser) throw new Error("No user logged in");
    try {
      const email = auth.currentUser.email;
      if (!email) throw new Error("No email found for user");
      
      const response = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'verify' })
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to send verification email';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      showToast("E-mail de verificação enviado! Verifique sua caixa de entrada.", "success");
    } catch (error: any) {
      showToast("Erro ao enviar e-mail de verificação: " + (error.message || error), "error");
      throw error;
    }
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
      showToast("Login com Google realizado com sucesso!", "success");
    } catch (error: any) {
      console.error("Full Google Login Error Object:", error);
      let errorMsg = "Erro ao fazer login com Google.";
      if (error.code === 'auth/operation-not-allowed') {
        errorMsg = "O login com Google não está ativado no Firebase Console.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMsg = "Este domínio não está autorizado no Firebase Console. Por favor, adicione '" + window.location.hostname + "' aos domínios autorizados.";
      } else if (error.code === 'auth/invalid-api-key') {
        errorMsg = "A chave de API do Firebase é inválida. Verifique sua configuração.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      showToast(errorMsg, "error");
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, username: string, name: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    
    try {
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
      showToast("Sua conta foi criada com sucesso! Bem-vindo(a)!", "success");
    } catch (error: any) {
      showToast("Erro ao criar conta: " + (error.message || error), "error");
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string, remember: boolean = true) => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, email, pass);
      showToast("Login realizado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao realizar login: " + (error.message || error), "error");
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
      const response = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'reset' })
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to send reset email';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      showToast("E-mail de redefinição de senha enviado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao enviar e-mail de redefinição: " + (error.message || error), "error");
      throw error;
    }
  };

  const updateUserEmail = async (email: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    try {
      await updateEmail(auth.currentUser, email);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { email });
      showToast("Endereço de e-mail atualizado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao atualizar e-mail: " + (error.message || error), "error");
      throw error;
    }
  };

  const updateUserPassword = async (password: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    try {
      await updatePassword(auth.currentUser, password);
      showToast("Sua senha foi alterada com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao atualizar senha: " + (error.message || error), "error");
      throw error;
    }
  };

  const updateUserUsername = async (username: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    
    try {
      // Check if username is taken
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(q);
      if (!snapshot.empty && snapshot.docs[0].id !== auth.currentUser.uid) {
        throw new Error("Username already taken");
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), { username });
      showToast("Nome de usuário atualizado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao atualizar nome de usuário: " + (error.message || error), "error");
      throw error;
    }
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
      showToast("Sua conta foi excluída permanentemente.", "success");
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        showToast("Necessário login recente para excluir a conta.", "error");
        throw error;
      }
      showToast("Erro ao excluir conta.", "error");
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const logout = async () => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
      await signOut(auth);
      showToast("Você saiu da sua conta.", "info");
    } catch (error: any) {
      showToast("Erro ao desconectar: " + (error.message || error), "error");
      throw error;
    }
  };

  const followUser = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");
    
    try {
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
      showToast(`Agora você está seguindo @${targetProfile.username}!`, "success");
    } catch (error: any) {
      showToast("Erro ao seguir usuário: " + (error.message || error), "error");
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const sendFollowRequest = async (targetUid: string) => {
    if (!userProfile || !currentUser) throw new Error("User not authenticated");
    
    try {
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
      showToast("Solicitação de seguidor enviada com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao enviar solicitação para seguir: " + (error.message || error), "error");
      throw error;
    }
  };

  const cancelFollowRequest = async (targetUid: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    try {
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
      showToast("Solicitação para seguir cancelada com sucesso.", "info");
    } catch (error: any) {
      showToast("Erro ao cancelar solicitação: " + (error.message || error), "error");
      throw error;
    }
  };

  const acceptFollowRequest = async (requestId: string) => {
     if (!userProfile || !currentUser) throw new Error("User not authenticated");
     try {
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
       showToast("Solicitação de seguidor aceita!", "success");
     } catch (error: any) {
       showToast("Erro ao aceitar solicitação: " + (error.message || error), "error");
       throw error;
     }
  };

  const declineFollowRequest = async (requestId: string) => {
      if (!currentUser) throw new Error("User not authenticated");
      try {
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
        showToast("Solicitação de seguidor recusada.", "info");
      } catch (error: any) {
        showToast("Erro ao recusar solicitação: " + (error.message || error), "error");
        throw error;
      }
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
      showToast("Conteúdo denunciado com sucesso! Obrigado pela colaboração.", "success");
    } catch (error: any) {
      showToast("Erro ao enviar denúncia: " + (error.message || error), "error");
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
      showToast("Sua solicitação de verificação foi enviada!", "success");
    } catch (error: any) {
      showToast("Erro ao solicitar verificação: " + (error.message || error), "error");
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
      showToast("Você deixou de seguir este usuário.", "info");
    } catch (error: any) {
      showToast("Erro ao deixar de seguir: " + (error.message || error), "error");
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
      showToast("Usuário adicionado à sua Roda!", "success");
    } catch (error: any) {
      showToast("Erro ao adicionar à Roda: " + (error.message || error), "error");
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
      showToast("Usuário removido da sua Roda.", "info");
    } catch (error: any) {
      showToast("Erro ao remover da Roda: " + (error.message || error), "error");
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
      showToast("Removido o silenciamento do usuário.", "info");
    } catch (error: any) {
      showToast("Erro ao desmutar usuário: " + (error.message || error), "error");
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
      showToast("Usuário silenciado com sucesso.", "info");
    } catch (error: any) {
      showToast("Erro ao silenciar usuário: " + (error.message || error), "error");
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
      showToast("Usuário bloqueado com sucesso.", "info");
    } catch (error: any) {
      showToast("Erro ao bloquear usuário: " + (error.message || error), "error");
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
      showToast("Usuário desbloqueado com sucesso.", "info");
    } catch (error: any) {
      showToast("Erro ao desbloquear usuário: " + (error.message || error), "error");
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
      showToast("Postagem salva nos itens salvos!", "success");
    } catch (error: any) {
      showToast("Erro ao salvar postagem: " + (error.message || error), "error");
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
      showToast("Postagem removida dos itens salvos.", "info");
    } catch (error: any) {
      showToast("Erro ao remover dos itens salvos: " + (error.message || error), "error");
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
      showToast("Postagem fixada no seu perfil!", "success");
    } catch (error: any) {
      showToast("Erro ao fixar postagem: " + (error.message || error), "error");
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
      showToast("Postagem desfixada do seu perfil.", "info");
    } catch (error: any) {
      showToast("Erro ao desfixar postagem: " + (error.message || error), "error");
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
      showToast("Parabéns! Modo Criador ativado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao ativar modo criador: " + (error.message || error), "error");
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
      showToast(`Palavra "${word}" foi silenciada em seu feed.`, "info");
    } catch (error: any) {
      showToast("Erro ao silenciar palavra: " + (error.message || error), "error");
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
      showToast(`Palavra "${word}" removida do silenciamento.`, "info");
    } catch (error: any) {
      showToast("Erro ao remover palavra silenciada: " + (error.message || error), "error");
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
        showToast("Permissão de notificações concedida!", "success");
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      showToast("Erro ao ativar notificações: " + (error.message || error), "error");
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
      showToast("Item adquirido com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao adquirir item: " + (error.message || error), "error");
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const equipItem = async (itemId: string, category: 'frames' | 'themes') => {
    if (!currentUser || !userProfile) throw new Error("Não autenticado");
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const field = category === 'frames' ? 'equippedFrame' : 'equippedTheme';
      const isEquipped = category === 'frames'
        ? userProfile.equippedFrame === itemId
        : userProfile.equippedTheme === itemId;

      await updateDoc(userRef, {
        [field]: isEquipped ? '' : itemId
      });

      showToast(isEquipped ? "Item desequipado!" : "Item equipado com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao equipar item: " + (error.message || error), "error");
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
    resetPassword,
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
    purchaseItem,
    equipItem,
    showToast
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </AuthContext.Provider>
  );
}
