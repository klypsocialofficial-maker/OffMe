import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Heart, MessageCircle, Repeat2, Share, Trash2, MoreHorizontal, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { socialService } from '../services/socialService';
import { useProfile } from '../hooks/useProfile';

interface Props {
  post: Post;
}

const PostCard: React.FC<Props> = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { profile: currentUserProfile } = useProfile();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const likeId = `${user.uid}_${post.id}`;
    const unsubscribe = onSnapshot(doc(db, 'likes', likeId), (doc) => {
      setLiked(doc.exists());
    });
    return () => unsubscribe();
  }, [user, post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentUserProfile || loading) return;

    setLoading(true);
    try {
      if (liked) {
        await socialService.unlikePost(user.uid, post.id);
      } else {
        await socialService.likePost(user.uid, post, currentUserProfile);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.uid !== post.authorUid || loading) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      // Update user postsCount
      await updateDoc(doc(db, 'users', user.uid), {
        postsCount: increment(-1)
      });
    } catch (err) {
      console.error('Error deleting post:', err);
      handleFirestoreError(err, OperationType.DELETE, 'posts');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const timeAgo = post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now';
  const isScheduled = post.scheduledFor && post.scheduledFor.toDate() > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 sm:p-6 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer bg-white"
    >
      <div className="flex gap-3 sm:gap-4">
        <img
          src={post.authorPhoto || 'https://picsum.photos/seed/user/100/100'}
          alt={post.authorName}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-shadow"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
              <span className="font-black text-black tracking-tight hover:underline text-sm sm:text-base">{post.authorName}</span>
              <span className="text-gray-400 font-medium text-xs sm:text-sm">@{post.authorUsername}</span>
              <span className="text-gray-300 font-bold text-[10px] sm:text-xs uppercase tracking-widest">• {timeAgo}</span>
              {isScheduled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  Scheduled
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {user?.uid === post.authorUid && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4 flex flex-col gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-bold tracking-tight">Delete this post?</span>
                </div>
                <p className="text-sm text-red-500 font-medium">This action cannot be undone and it will be removed from your profile and feed.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={loading}
                    className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-lg text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {post.imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="w-full max-h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {post.location && (
            <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs mt-3">
              <MapPin className="w-3.5 h-3.5" />
              <span>{post.location.name || 'Location'}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 text-gray-400">
            <button className="flex items-center gap-2 group/btn hover:text-black transition-all p-2 hover:bg-gray-100 rounded-xl">
              <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-widest uppercase">{post.repliesCount || 0}</span>
            </button>
            <button className="flex items-center gap-2 group/btn hover:text-green-500 transition-all p-2 hover:bg-green-50 rounded-xl">
              <Repeat2 className="w-5 h-5 group-hover/btn:rotate-180 transition-transform duration-500" />
              <span className="text-xs font-bold tracking-widest uppercase">{post.repostsCount || 0}</span>
            </button>
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 group/btn transition-all p-2 rounded-xl",
                liked ? "text-red-500 bg-red-50" : "hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart className={cn("w-5 h-5 group-hover/btn:scale-125 transition-transform", liked && "fill-current")} />
              <span className="text-xs font-bold tracking-widest uppercase">{post.likesCount || 0}</span>
            </button>
            <button className="flex items-center gap-2 group/btn hover:text-black transition-all p-2 hover:bg-gray-100 rounded-xl">
              <Share className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PostCard;
