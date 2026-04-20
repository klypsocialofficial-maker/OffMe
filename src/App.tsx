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
import Bookmarks from './pages/Bookmarks';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Missions from './pages/Missions';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import DisplaySettings from './pages/DisplaySettings';
import PrivacySettings from './pages/PrivacySettings';
import CreatorStudio from './pages/CreatorStudio';
import PWABadge from './components/PWABadge';
import SplashScreen from './components/SplashScreen';
import AnonymousFeed from './pages/AnonymousFeed';
import InstallPrompt from './components/InstallPrompt';
import AdminPanel from './pages/AdminPanel';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-black rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      <AuthProvider>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
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
            <Route path="post/:postId" element={<PostDetail />} />
            <Route path="trending" element={<Trending />} />
            <Route path="premium" element={<Premium />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="communities" element={<Communities />} />
            <Route path="communities/:slug" element={<CommunityDetail />} />
            <Route path="missions" element={<Missions />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/account" element={<AccountSettings />} />
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
