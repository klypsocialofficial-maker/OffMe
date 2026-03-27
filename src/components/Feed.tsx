import React, { useState } from 'react';
import { auth } from '../firebase';
import { Post } from '../types';
import PostCard from './PostCard';
import PostForm from './PostForm';
import { useDrawer } from '../contexts/DrawerContext';
import { usePosts, PostFilters } from '../hooks/usePosts';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Filter, Image as ImageIcon, MapPin, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Feed() {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PostFilters>({});
  const { posts, loading } = usePosts(undefined, activeTab === 'following', filters);
  const { openDrawer } = useDrawer();
  const { t } = useLanguage();

  const activeFilterCount = (filters.hasMedia ? 1 : 0) + 
                            (filters.hasLocation ? 1 : 0) + 
                            (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0);

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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                showFilters || activeFilterCount > 0 ? "bg-black text-white" : "hover:bg-gray-100 text-black"
              )}
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && !showFilters && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 bg-gray-50 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500">Filters</h3>
                  <button 
                    onClick={() => {
                      setFilters({});
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, hasMedia: !prev.hasMedia }))}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                      filters.hasMedia 
                        ? "bg-black text-white" 
                        : "bg-white text-gray-600 border border-gray-200 hover:border-black"
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Has Media
                  </button>
                  
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, hasLocation: !prev.hasLocation }))}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                      filters.hasLocation 
                        ? "bg-black text-white" 
                        : "bg-white text-gray-600 border border-gray-200 hover:border-black"
                    )}
                  >
                    <MapPin className="w-4 h-4" />
                    Has Location
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        if (date) {
                          // Adjust for local timezone to avoid off-by-one day issues
                          date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                        }
                        setFilters(prev => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            start: date,
                            end: prev.dateRange?.end || null
                          }
                        }));
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                    <span className="text-gray-400 font-bold">to</span>
                    <input
                      type="date"
                      value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        if (date) {
                          // Adjust for local timezone
                          date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                        }
                        setFilters(prev => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            start: prev.dateRange?.start || null,
                            end: date
                          }
                        }));
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                layoutId="activeTabFeed"
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
                layoutId="activeTabFeed"
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
