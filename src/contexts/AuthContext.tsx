import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, username: string, name: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Fallback if profile doesn't exist yet
            setUserProfile({
              uid: user.uid,
              email: user.email || '',
              username: user.email?.split('@')[0] || 'user',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || ''
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase not initialized");
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in db
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Create new user profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        username: user.email?.split('@')[0] || 'user',
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || ''
      };
      await setDoc(docRef, newProfile);
      setUserProfile(newProfile);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, username: string, name: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const user = result.user;
    
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      username: username,
      displayName: name,
      photoURL: ''
    };
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setUserProfile(newProfile);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    if (!auth) throw new Error("Firebase not initialized");
    return signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    logout,
    signUpWithEmail,
    loginWithEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
