/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import PWABadge from './components/PWABadge';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center">Loading...</div>;
  }
  
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
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
          </Route>
        </Routes>
        <PWABadge />
      </Router>
    </AuthProvider>
  );
}
