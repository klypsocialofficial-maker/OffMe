import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, deleteDoc, onSnapshot, getDocs, query, collection, where } from 'firebase/firestore';
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
  const [reposted, setReposted] = useState(false);
  const [repostedPost, setRepostedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  useEffect(() => {
    if (post.repostedPostId) {
      const unsubscribe = onSnapshot(doc(db, 'posts', post.repostedPostId), (doc) => {
        if (doc.exists()) {
          setRepostedPost({ id: doc.id, ...doc.data() } as Post);
        }
      });
      return () => unsubscribe();
    }
  }, [post.repostedPostId]);

  useEffect(() => {
    if (!user || !post.id) return;
    // Check if current user has reposted this post
    // This is a bit complex because reposts are just posts with repostedPostId
    // For simplicity, we'll just track if the current post IS a repost or if we can find one
    // But usually, we want to highlight the repost button if the user has reposted the ORIGINAL post
    const targetId = post.repostedPostId || post.id;
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', user.uid),
      where('repostedPostId', '==', targetId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReposted(!snapshot.empty);
    });
    return () => unsubscribe();
  }, [user, post.id, post.repostedPostId]);

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

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentUserProfile || loading) return;

    setLoading(true);
    try {
      const targetPost = repostedPost || post;
      if (reposted) {
        // Find the repost to delete
        const q = query(
          collection(db, 'posts'),
          where('authorUid', '==', user.uid),
          where('repostedPostId', '==', targetPost.id)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const repostDoc = snapshot.docs[0];
          await socialService.unrepostPost(user.uid, repostDoc.id, targetPost.id);
        }
      } else {
        await socialService.repostPost(user.uid, targetPost, currentUserProfile);
      }
    } catch (err) {
      console.error('Error reposting:', err);
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

  const displayPost = repostedPost || post;
  const displayTimeAgo = displayPost.createdAt ? formatDistanceToNow(displayPost.createdAt.toDate()) + ' ago' : 'Just now';

  if (post.repostedPostId && !repostedPost) {
    return (
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-white animate-pulse">
        <div className="flex items-center gap-2 mb-3 ml-12">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="flex gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 sm:p-6 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-300 group cursor-pointer bg-white"
    >
      {post.repostedPostId && (
        <div className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mb-3 ml-12">
          <Repeat2 className="w-4 h-4" />
          <span>{post.authorUid === user?.uid ? 'You' : post.authorName} reposted</span>
        </div>
      )}
      <div className="flex gap-3 sm:gap-4">
        <img
          src={displayPost.authorPhoto || 'https://picsum.photos/seed/user/100/100'}
          alt={displayPost.authorName}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-shadow"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
              <span className="font-black text-black tracking-tight hover:underline text-sm sm:text-base">{displayPost.authorName}</span>
              <span className="text-gray-400 font-medium text-xs sm:text-sm">@{displayPost.authorUsername}</span>
              <span className="text-gray-300 font-bold text-[10px] sm:text-xs uppercase tracking-widest">• {displayTimeAgo}</span>
              {isScheduled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  Scheduled
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                      }} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user?.uid === post.authorUid && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors font-bold text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Post
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          // Implement share logic if needed
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-bold text-sm"
                      >
                        <Share className="w-4 h-4" />
                        Share Post
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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
            {displayPost.content}
          </p>

          {displayPost.imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <img 
                src={displayPost.imageUrl} 
                alt="Post content" 
                className="w-full max-h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {displayPost.location && (
            <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs mt-3">
              <MapPin className="w-3.5 h-3.5" />
              <span>{displayPost.location.name || 'Location'}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 text-gray-400">
            <button className="flex items-center gap-2 group/btn hover:text-black transition-all p-2 hover:bg-gray-100 rounded-xl">
              <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-widest uppercase">{displayPost.repliesCount || 0}</span>
            </button>
            <button 
              onClick={handleRepost}
              className={cn(
                "flex items-center gap-2 group/btn transition-all p-2 rounded-xl",
                reposted ? "text-green-500 bg-green-50" : "hover:text-green-500 hover:bg-green-50"
              )}
            >
              <Repeat2 className={cn("w-5 h-5 group-hover/btn:rotate-180 transition-transform duration-500", reposted && "scale-110")} />
              <span className="text-xs font-bold tracking-widest uppercase">{displayPost.repostsCount || 0}</span>
            </button>
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 group/btn transition-all p-2 rounded-xl",
                liked ? "text-red-500 bg-red-50" : "hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart className={cn("w-5 h-5 group-hover/btn:scale-125 transition-transform", liked && "fill-current")} />
              <span className="text-xs font-bold tracking-widest uppercase">{displayPost.likesCount || 0}</span>
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
