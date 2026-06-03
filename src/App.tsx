/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Trending from './pages/Trending';
import Premium from './pages/Premium';
import PremiumCheckoutSimulation from './pages/PremiumCheckoutSimulation';
import Bookmarks from './pages/Bookmarks';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Missions from './pages/Missions';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import DisplaySettings from './pages/DisplaySettings';
import PrivacySettings from './pages/PrivacySettings';
import ConnectedDevices from './pages/ConnectedDevices';
import CreatorStudio from './pages/CreatorStudio';
import Circle from './pages/Circle';
import Shop from './pages/Shop';
import Leaderboard from './pages/Leaderboard';
import PWABadge from './components/PWABadge';
import SplashScreen from './components/SplashScreen';
import AnonymousFeed from './pages/AnonymousFeed';
import InstallPrompt from './components/InstallPrompt';
import AdminPanel from './pages/AdminPanel';
import { seedMissions } from './services/missionsService';

import { Shield, Lock, ArrowRight, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { db } from './firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading, logout } = useAuth();
  const [pinInput, setPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState('');

  const isVerifiedInSession = currentUser 
    ? sessionStorage.getItem('offme_2fa_verified_' + currentUser.uid) === 'true' 
    : false;

  useEffect(() => {
    if (isVerifiedInSession) {
      setIsPinVerified(true);
    } else {
      setIsPinVerified(false);
    }
  }, [isVerifiedInSession, currentUser]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white dark:bg-black">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check if 2FA is active and not verified yet
  if (userProfile?.twoFactorEnabled && !isPinVerified) {
    const handleVerifyPIN = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setPinError('');

      try {
        const correctPIN = userProfile.twoFactorPIN;
        const backupCodes = userProfile.twoFactorBackupCodes || [];

        // Check PIN or backup codes
        if (pinInput === correctPIN) {
          sessionStorage.setItem('offme_2fa_verified_' + currentUser.uid, 'true');
          setIsPinVerified(true);
        } else if (backupCodes.includes(pinInput)) {
          // It's a valid backup code! Remove it from Firestore so it's single-use
          await updateDoc(doc(db, 'users', currentUser.uid), {
            twoFactorBackupCodes: arrayRemove(pinInput)
          });
          sessionStorage.setItem('offme_2fa_verified_' + currentUser.uid, 'true');
          setIsPinVerified(true);
        } else {
          setPinError('Código ou PIN inválido. Verifique e tente novamente.');
        }
      } catch (err) {
        console.error(err);
        setPinError('Erro ao validar o código.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 relative overflow-hidden transition-colors">
        {/* Background decorative elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 dark:bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-[120px]" />

        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-8 sm:p-10 rounded-[2.5rem] shadow-xl z-10 transition-colors">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-md shadow-emerald-5000/15 animate-bounce">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white leading-tight">
              Verificação em duas etapas
            </h2>
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400 max-w-[280px]">
              Olá, <span className="font-bold text-gray-800 dark:text-gray-200">@{userProfile?.username}</span>! Digite o seu PIN de 6 dígitos ou um código de backup para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleVerifyPIN} className="mt-8 space-y-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="PIN de 6 dígitos ou código de backup"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.trim())}
                  className="appearance-none rounded-2xl relative block w-full px-4 py-3.5 pl-11 border border-gray-200 dark:border-zinc-700 placeholder-gray-400 text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm font-medium font-mono tracking-wide"
                />
              </div>
            </div>

            {pinError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-normal">{pinError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={submitting || !pinInput}
                className="w-full flex justify-center py-4 px-4 text-sm font-bold rounded-2xl text-white bg-black hover:opacity-90 dark:bg-white dark:text-black focus:outline-none transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Desbloquear conta</span>}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-3 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair desta conta</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    seedMissions();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            } 
          >
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:conversationId" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
            <Route path=":username" element={<Profile />} />
            <Route path="creator-studio" element={<CreatorStudio />} />
            <Route path="shop" element={<Shop />} />
            <Route path="post/:postId" element={<PostDetail />} />
            <Route path="trending" element={<Trending />} />
            <Route path="premium" element={<Premium />} />
            <Route path="premium-checkout-simulation" element={<PremiumCheckoutSimulation />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="circle" element={<Circle />} />
            <Route path="communities" element={<Communities />} />
            <Route path="communities/:slug" element={<CommunityDetail />} />
            <Route path="missions" element={<Missions />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/account" element={<AccountSettings />} />
            <Route path="settings/devices" element={<ConnectedDevices />} />
            <Route path="settings/privacy" element={<PrivacySettings />} />
            <Route path="settings/display" element={<DisplaySettings />} />
            <Route path="anonymous-feed" element={<AnonymousFeed />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
        <InstallPrompt />
        <PWABadge />
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}
