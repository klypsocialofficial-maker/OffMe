import React, { useState } from 'react';
import { loginWithGoogle, db, auth, handleFirestoreError, OperationType, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { LogIn, Sparkles, Twitter, MessageCircle, Mail, Lock, User as UserIcon, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const checkUsernameUnique = async (uname: string) => {
    const q = query(collection(db, 'users'), where('username', '==', uname.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const baseUsername = user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`;
        let finalUsername = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        // Ensure uniqueness for Google users too
        let isUnique = await checkUsernameUnique(finalUsername);
        if (!isUnique) {
          finalUsername = `${finalUsername}${Math.floor(Math.random() * 1000)}`;
        }

        const userData = {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous',
          username: finalUsername,
          photoURL: user.photoURL || '',
          bio: '',
          createdAt: serverTimestamp(),
          role: 'user',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0
        };
        await setDoc(userDocRef, userData);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login with Google');
      handleFirestoreError(err, OperationType.WRITE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Validate inputs
        if (!username || !displayName || !email || !password) {
          throw new Error('All fields are required');
        }
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }

        // Check username uniqueness
        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) {
          throw new Error('Username is already taken');
        }

        // Create user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Update profile
        await updateProfile(user, { displayName });

        // Create Firestore document
        const userData = {
          uid: user.uid,
          displayName,
          username: username.toLowerCase(),
          photoURL: '',
          bio: '',
          createdAt: serverTimestamp(),
          role: 'user',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0
        };
        await setDoc(doc(db, 'users', user.uid), userData);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black text-white mb-4 shadow-xl rotate-3">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-black">OffMe.</h1>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-2xl shadow-black/5">
          <h2 className="text-2xl font-black mb-6 text-black tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all disabled:opacity-50 active:scale-95 shadow-lg"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                isSignUp ? 'Sign Up' : 'Log In'
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4 text-gray-300">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-gray-100 text-black rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="mt-8 text-center text-gray-500 font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-black font-black hover:underline"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-gray-400 text-xs font-medium tracking-wide">
        &copy; 2026 OffMe. All rights reserved.
      </div>
    </div>
  );
}
