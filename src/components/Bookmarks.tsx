import React from 'react';
import { motion } from 'motion/react';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import PostCard from './PostCard';

export default function Bookmarks() {
  // In a real app, we would fetch bookmarked post IDs from a user's bookmarks collection
  // For now, let's show a placeholder or filter posts if we had a bookmark field
  const { posts, loading } = usePosts();

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
        <h2 className="text-2xl font-black tracking-tight">Bookmarks</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Your saved posts</p>
      </div>

      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookmarkIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black mb-2">Save posts for later</h3>
            <p className="text-gray-400 max-w-xs mx-auto">Don't let the good stuff get away! Bookmark posts to easily find them again in the future.</p>
          </div>
        ) : (
          posts.slice(0, 5).map((post) => (
            <div key={post.id} className="relative group">
              <PostCard post={post} />
              <button className="absolute top-4 right-12 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
