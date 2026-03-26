import React, { useState } from 'react';
import { auth } from '../firebase';
import { Post } from '../types';
import PostCard from './PostCard';
import PostForm from './PostForm';
import { useDrawer } from '../contexts/DrawerContext';
import { usePosts } from '../hooks/usePosts';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Feed() {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const { posts, loading } = usePosts(undefined, activeTab === 'following');
  const { openDrawer } = useDrawer();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100">
        <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-black">{t('home')}</h1>
          </div>
          <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('for-you')}
            className={cn(
              "flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all relative",
              activeTab === 'for-you' ? "text-black" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            For You
            {activeTab === 'for-you' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-black"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={cn(
              "flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all relative",
              activeTab === 'following' ? "text-black" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            Following
            {activeTab === 'following' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-black"
              />
            )}
          </button>
        </div>
      </div>

      <div className="hidden sm:block">
        <PostForm />
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('loading')}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </AnimatePresence>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-gray-200" />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Nothing to see here yet</h2>
            <p className="text-gray-400 font-medium">Be the first to share what's on your mind!</p>
          </div>
        )}
      </div>
    </div>
  );
}
