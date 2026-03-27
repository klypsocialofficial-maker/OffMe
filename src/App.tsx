import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, FirebaseUser } from './firebase';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import Explore from './components/Explore';
import Messages from './components/Messages';
import Chat from './components/Chat';
import Lists from './components/Lists';
import Bookmarks from './components/Bookmarks';
import Communities from './components/Communities';
import Settings from './components/Settings';
import PostView from './components/PostView';
import AccessibilitySettings from './components/AccessibilitySettings';
import HelpCenter from './components/HelpCenter';
import LanguageSettings from './components/LanguageSettings';
import Layout from './components/Layout';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-16 h-16 rounded-3xl bg-black flex items-center justify-center shadow-2xl animate-pulse">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-sm font-black text-black uppercase tracking-[0.2em] animate-pulse">OffMe.</p>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <Router>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Auth />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route
                path="/"
                element={
                  <Layout>
                    <Feed />
                  </Layout>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <Layout>
                    <Profile />
                  </Layout>
                }
              />
              <Route
                path="/notifications"
                element={
                  <Layout>
                    <Notifications />
                  </Layout>
                }
              />
              <Route
                path="/explore"
                element={
                  <Layout>
                    <Explore />
                  </Layout>
                }
              />
              <Route
                path="/messages"
                element={
                  <Layout>
                    <Messages />
                  </Layout>
                }
              />
              <Route
                path="/messages/:conversationId"
                element={
                  <Layout>
                    <Chat />
                  </Layout>
                }
              />
              <Route
                path="/lists"
                element={
                  <Layout>
                    <Lists />
                  </Layout>
                }
              />
              <Route
                path="/bookmarks"
                element={
                  <Layout>
                    <Bookmarks />
                  </Layout>
                }
              />
              <Route
                path="/communities"
                element={
                  <Layout>
                    <Communities />
                  </Layout>
                }
              />
              <Route
                path="/settings"
                element={
                  <Layout>
                    <Settings />
                  </Layout>
                }
              />
              <Route
                path="/post/:postId"
                element={
                  <Layout>
                    <PostView />
                  </Layout>
                }
              />
              <Route
                path="/settings/accessibility"
                element={
                  <Layout>
                    <AccessibilitySettings />
                  </Layout>
                }
              />
              <Route
                path="/settings/help"
                element={
                  <Layout>
                    <HelpCenter />
                  </Layout>
                }
              />
              <Route
                path="/settings/languages"
                element={
                  <Layout>
                    <LanguageSettings />
                  </Layout>
                }
              />
              {/* Fallback for other routes */}
              <Route
                path="*"
                element={
                  <Layout>
                    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
                      <h2 className="text-4xl font-black mb-4 tracking-tighter">Coming Soon</h2>
                      <p className="text-gray-400 font-medium max-w-xs">We're building this feature as fast as we can. Stay tuned!</p>
                    </div>
                  </Layout>
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </ErrorBoundary>
  </LanguageProvider>
  );
}
