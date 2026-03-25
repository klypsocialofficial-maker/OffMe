import React, { useState, useEffect } from 'react';
import { db, collection, query, where, limit, onSnapshot, auth, doc } from '../firebase';
import { UserProfile } from '../types';
import { Search, UserPlus, UserCheck, Loader2, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useDrawer } from '../contexts/DrawerContext';
import { socialService } from '../services/socialService';
import { chatService } from '../services/chatService';
import { useProfile } from '../hooks/useProfile';
import { cn } from '../lib/utils';

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { openDrawer } = useDrawer();
  const { profile: currentUserProfile } = useProfile();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    // Search by username prefix
    const q = query(
      collection(db, 'users'),
      where('username', '>=', lowercaseSearch),
      where('username', '<=', lowercaseSearch + '\uf8ff'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({ ...doc.data() } as UserProfile))
        .filter(u => u.uid !== currentUser?.uid);
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error searching users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [searchTerm, currentUser?.uid]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 flex items-center gap-4">
        <button 
          onClick={openDrawer}
          className="sm:hidden focus:outline-none active:scale-95 transition-transform"
        >
          <img
            src={auth.currentUser?.photoURL || 'https://picsum.photos/seed/user/100/100'}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
            referrerPolicy="no-referrer"
          />
        </button>
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:border-black focus:bg-white rounded-2xl outline-none font-bold text-lg transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {!searchTerm.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Explore OffMe</h3>
              <p className="text-gray-400 font-medium max-w-xs">Search for your friends or discover new creators by their username.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 font-bold text-lg">No users found for "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {users.map((user) => (
                <UserRow key={user.uid} user={user} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: UserProfile }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;
  const { profile: currentUserProfile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const followId = `${currentUser.uid}_${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'follows', followId), (doc) => {
      setIsFollowing(doc.exists());
    });
    return () => unsubscribe();
  }, [currentUser, user.uid]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || !currentUserProfile || loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollowUser(currentUser.uid, user.uid);
      } else {
        await socialService.followUser(currentUser.uid, user.uid, currentUserProfile);
      }
    } catch (err) {
      console.error("Error following/unfollowing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || !currentUserProfile || loading) return;

    setLoading(true);
    try {
      const conversationId = await chatService.getOrCreateConversation(currentUserProfile, user);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <Link
        to={`/profile/${user.uid}`}
        className="flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
      >
        <div className="flex items-center gap-4">
          <img
            src={user.photoURL || 'https://picsum.photos/seed/user/100/100'}
            alt={user.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-all"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="font-black text-black tracking-tight truncate">{user.displayName}</p>
            <p className="text-sm text-gray-400 font-medium truncate">@{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMessage}
            disabled={loading}
            className="p-2 border-2 border-black text-black rounded-full hover:bg-black hover:text-white transition-all active:scale-95 disabled:opacity-30"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={handleFollow}
            disabled={loading}
            className={cn(
              "px-6 py-2 rounded-full font-black text-sm transition-all active:scale-95 flex items-center gap-2",
              isFollowing 
                ? "bg-gray-100 text-black hover:bg-red-50 hover:text-red-500 hover:border-red-100 border border-transparent" 
                : "bg-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Follow</span>
              </>
            )}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}
