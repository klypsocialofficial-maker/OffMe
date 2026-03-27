import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, deleteDoc, onSnapshot, getDocs, query, collection, where, getDoc, orderBy, limit } from 'firebase/firestore';
import { Heart, MessageCircle, Repeat2, Share, Trash2, MoreHorizontal, MapPin, Quote, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, UserProfile } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { socialService } from '../services/socialService';
import { useProfile } from '../hooks/useProfile';
import PostForm from './PostForm';

interface Props {
  post: Post;
  isDetailed?: boolean;
  showThreadLine?: boolean;
}

const PostCard: React.FC<Props> = ({ post, isDetailed = false, showThreadLine = false }) => {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [repostedPost, setRepostedPost] = useState<Post | null>(null);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [justReposted, setJustReposted] = useState(false);
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile: currentUserProfile } = useProfile();
  const user = auth.currentUser;

  useEffect(() => {
    if (!post.id) return;
    const q = query(
      collection(db, 'likes'),
      where('postId', '==', post.id)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const likesData = snapshot.docs.map(doc => doc.data());
      likesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      const userIds = likesData.map(data => data.userId);
      if (userIds.length === 0) {
        setLikers([]);
        return;
      }

      const profiles: UserProfile[] = [];
      for (const uid of userIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          profiles.push({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
        }
        if (profiles.length >= 3) break;
      }
      setLikers(profiles);
    });
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  useEffect(() => {
    if (!post.id) return;
    const unsubscribe = onSnapshot(doc(db, 'posts', post.id), (doc) => {
      if (doc.exists()) {
        setCurrentPost({ id: doc.id, ...doc.data() } as Post);
      }
    });
    return () => unsubscribe();
  }, [post.id]);

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
    if (post.quotedPostId) {
      const unsubscribe = onSnapshot(doc(db, 'posts', post.quotedPostId), (doc) => {
        if (doc.exists()) {
          setQuotedPost({ id: doc.id, ...doc.data() } as Post);
        }
      });
      return () => unsubscribe();
    }
  }, [post.quotedPostId]);

  useEffect(() => {
    if (!user || !post.id) return;
    const targetId = post.repostedPostId || post.id;
    const q = query(
      collection(db, 'posts'),
      where('repostedPostId', '==', targetId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const isReposted = snapshot.docs.some(doc => doc.data().authorUid === user.uid);
      setReposted(isReposted);
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
        setJustLiked(true);
        setTimeout(() => setJustLiked(false), 1000);
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
        const q = query(
          collection(db, 'posts'),
          where('repostedPostId', '==', targetPost.id)
        );
        const snapshot = await getDocs(q);
        const repostDoc = snapshot.docs.find(doc => doc.data().authorUid === user.uid);
        if (repostDoc) {
          await socialService.unrepostPost(user.uid, repostDoc.id, targetPost.id);
        }
      } else {
        setJustReposted(true);
        setTimeout(() => setJustReposted(false), 1000);
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/post/${displayPost.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${displayPost.authorName}`,
          text: displayPost.content,
          url: shareUrl,
        });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {}
    }
  };

  const displayPost = repostedPost || currentPost;
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

  const renderMenu = () => (
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
                handleShare(e);
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
  );

  const renderContent = (isDetailedView: boolean) => (
    <div className="space-y-3">
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

      <p className={cn(
        "text-gray-900 leading-relaxed whitespace-pre-wrap",
        isDetailedView ? "text-lg sm:text-xl font-normal" : "text-base font-normal"
      )}>
        {displayPost.content}
      </p>

      {quotedPost && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/post/${quotedPost.id}`);
          }}
          className="mt-3 border border-gray-100 rounded-2xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <img
              src={quotedPost.authorPhoto || 'https://picsum.photos/seed/user/100/100'}
              className="w-5 h-5 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="font-black text-black text-xs">{quotedPost.authorName}</span>
            <span className="text-gray-400 text-xs">@{quotedPost.authorUsername}</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">{quotedPost.content}</p>
          {quotedPost.imageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-gray-50 max-h-40">
              <img src={quotedPost.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
      )}

      {displayPost.imageUrl && (
        <div className={cn(
          "mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm",
          isDetailedView ? "max-h-[600px]" : "max-h-[500px]"
        )}>
          <img 
            src={displayPost.imageUrl} 
            alt="Post content" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
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
    </div>
  );

  const renderActions = (isDetailedView: boolean) => (
    <div className={cn(
      "flex items-center justify-between text-gray-500",
      isDetailedView && "py-1"
    )}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowReplyForm(true);
        }}
        className="flex items-center gap-2 group/btn hover:text-black transition-all p-2 hover:bg-gray-100 rounded-xl"
      >
        <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
        <motion.span 
          key={displayPost.repliesCount}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest uppercase"
        >
          {displayPost.repliesCount || 0}
        </motion.span>
      </button>
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={handleRepost}
        className={cn(
          "flex items-center gap-2 group/btn transition-all p-2 rounded-xl relative",
          reposted ? "text-green-500 bg-green-50" : "hover:text-green-500 hover:bg-green-50"
        )}
      >
        <AnimatePresence>
          {justReposted && (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-green-400/20 rounded-full pointer-events-none"
              />
              <motion.span
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -20, opacity: 0 }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-green-600 font-black text-[10px]"
              >
                +1
              </motion.span>
            </>
          )}
        </AnimatePresence>
        <motion.div
          animate={reposted ? { rotate: 180, scale: [1, 1.2, 1] } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          <Repeat2 className={cn("w-5 h-5 transition-transform duration-500")} />
        </motion.div>
        <motion.span 
          key={displayPost.repostsCount}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest uppercase"
        >
          {displayPost.repostsCount || 0}
        </motion.span>
      </motion.button>
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          setShowQuoteForm(true);
        }}
        className="flex items-center gap-2 group/btn hover:text-blue-500 transition-all p-2 hover:bg-blue-50 rounded-xl"
      >
        <Quote className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
        <motion.span 
          key={displayPost.quotesCount}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest uppercase"
        >
          {displayPost.quotesCount || 0}
        </motion.span>
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        className={cn(
          "flex items-center gap-2 group/btn transition-all p-2 rounded-xl relative",
          liked ? "text-red-500 bg-red-50" : "hover:text-red-500 hover:bg-red-50"
        )}
      >
        <AnimatePresence>
          {justLiked && (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-400/20 rounded-full pointer-events-none"
              />
              <motion.span
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -20, opacity: 0 }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-red-600 font-black text-[10px]"
              >
                +1
              </motion.span>
            </>
          )}
        </AnimatePresence>
        <motion.div
          animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Heart className={cn("w-5 h-5 transition-transform", liked && "fill-current")} />
        </motion.div>
        <motion.span 
          key={displayPost.likesCount}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest uppercase"
        >
          {displayPost.likesCount || 0}
        </motion.span>
      </motion.button>
      <div className="relative">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="flex items-center gap-2 group/btn hover:text-black transition-all p-2 hover:bg-gray-100 rounded-xl"
        >
          <Share className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
        </motion.button>
        <AnimatePresence>
          {showShareTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -40, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg pointer-events-none whitespace-nowrap z-50"
            >
              Link Copied!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderLikers = () => {
    if (displayPost.likesCount === 0 || likers.length === 0) return null;
    return (
      <div className="flex items-center gap-2 py-2 mt-2">
        <div className="flex -space-x-2">
          {likers.map((liker) => (
            <Link
              key={liker.uid}
              to={`/profile/${liker.uid}`}
              onClick={(e) => e.stopPropagation()}
              className="relative inline-block"
            >
              <img
                src={liker.photoURL || 'https://picsum.photos/seed/user/100/100'}
                alt={liker.displayName}
                className="w-6 h-6 rounded-full border-2 border-white object-cover hover:z-10 transition-all hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-500 font-medium">
          {liked ? (
            displayPost.likesCount === 1 ? (
              <span className="font-bold text-black">You liked this</span>
            ) : (
              <>
                <span className="font-bold text-black">You</span> and{' '}
                <span className="font-bold text-black">
                  {displayPost.likesCount - 1} {displayPost.likesCount - 1 === 1 ? 'other' : 'others'}
                </span>{' '}
                liked this
              </>
            )
          ) : (
            <>
              <span className="font-bold text-black">{likers[0].displayName}</span>
              {displayPost.likesCount > 1 && (
                <>
                  {' '}and{' '}
                  <span className="font-bold text-black">
                    {displayPost.likesCount - 1} {displayPost.likesCount - 1 === 1 ? 'other' : 'others'}
                  </span>
                </>
              )}{' '}
              liked this
            </>
          )}
        </p>
      </div>
    );
  };

  const renderModals = () => (
    <>
      <AnimatePresence>
        {showReplyForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight">Reply to Post</h3>
                <button 
                  onClick={() => setShowReplyForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <PostForm 
                replyToPost={displayPost} 
                onSuccess={() => setShowReplyForm(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showQuoteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight">Quote Post</h3>
                <button 
                  onClick={() => setShowQuoteForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <PostForm 
                quotePost={displayPost} 
                onSuccess={() => setShowQuoteForm(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => !isDetailed && navigate(`/post/${displayPost.id}`)}
      className={cn(
        "p-4 sm:p-6 border-b border-gray-100 transition-all duration-300 group bg-white",
        !isDetailed && "hover:bg-gray-50/50 cursor-pointer"
      )}
    >
      {post.repostedPostId && (
        <div className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mb-3 ml-12">
          <Repeat2 className="w-4 h-4" />
          <span>{post.authorUid === user?.uid ? 'You' : post.authorName} reposted</span>
        </div>
      )}

      {isDetailed ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Link to={`/profile/${displayPost.authorUid}`} onClick={(e) => e.stopPropagation()}>
              <img
                src={displayPost.authorPhoto || 'https://picsum.photos/seed/user/100/100'}
                alt={displayPost.authorName}
                className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
                referrerPolicy="no-referrer"
              />
            </Link>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <Link 
                  to={`/profile/${displayPost.authorUid}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-gray-900 hover:underline text-base leading-tight truncate"
                >
                  {displayPost.authorName}
                </Link>
                {displayPost.communityId && (
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
                    {displayPost.communityId === '1' ? 'AI Artists' : displayPost.communityId === '2' ? 'Web Devs' : 'Designers'}
                  </span>
                )}
              </div>
              <Link 
                to={`/profile/${displayPost.authorUid}`}
                onClick={(e) => e.stopPropagation()}
                className="text-gray-500 text-sm truncate"
              >
                @{displayPost.authorUsername}
              </Link>
            </div>
            <div className="relative self-start">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {renderMenu()}
            </div>
          </div>

          <div className="mb-4">
            {renderContent(true)}
          </div>

          <div className="text-gray-500 text-sm mb-4 flex items-center gap-2">
            <span>
              {displayPost.createdAt ? new Intl.DateTimeFormat('en-US', { 
                hour: 'numeric', 
                minute: 'numeric', 
                hour12: true,
              }).format(displayPost.createdAt.toDate()) : 'Just now'}
            </span>
            <span>·</span>
            <span>
              {displayPost.createdAt ? new Intl.DateTimeFormat('en-US', { 
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }).format(displayPost.createdAt.toDate()) : ''}
            </span>
          </div>

          {(displayPost.repostsCount > 0 || displayPost.quotesCount > 0 || displayPost.likesCount > 0) && (
            <div className="py-3 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
              {displayPost.repostsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900">{displayPost.repostsCount}</span>
                  <span className="text-gray-500">Reposts</span>
                </div>
              )}
              {displayPost.quotesCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900">{displayPost.quotesCount}</span>
                  <span className="text-gray-500">Quotes</span>
                </div>
              )}
              {displayPost.likesCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900">{displayPost.likesCount}</span>
                  <span className="text-gray-500">Likes</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 pt-1">
            {renderActions(true)}
          </div>
          
          {likers.length > 0 && (
            <div className="mt-2">
              {renderLikers()}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3 sm:gap-4 relative">
          <div className="flex flex-col items-center shrink-0">
            <Link to={`/profile/${displayPost.authorUid}`} onClick={(e) => e.stopPropagation()}>
              <img
                src={displayPost.authorPhoto || 'https://picsum.photos/seed/user/100/100'}
                alt={displayPost.authorName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-all"
                referrerPolicy="no-referrer"
              />
            </Link>
            {showThreadLine && (
              <div className="w-0.5 bg-gray-200 flex-1 my-2 rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <Link 
                  to={`/profile/${displayPost.authorUid}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-black text-black tracking-tight hover:underline text-sm sm:text-base truncate"
                >
                  {displayPost.authorName}
                </Link>
                <Link 
                  to={`/profile/${displayPost.authorUid}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 font-medium text-sm truncate"
                >
                  @{displayPost.authorUsername}
                </Link>
                <span className="text-gray-300 font-bold text-xs shrink-0">• {displayTimeAgo}</span>
                {displayPost.communityId && (
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ml-1 shrink-0 hidden sm:inline-block">
                    {displayPost.communityId === '1' ? 'AI Artists' : displayPost.communityId === '2' ? 'Web Devs' : 'Designers'}
                  </span>
                )}
              </div>
              <div className="relative shrink-0 ml-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {renderMenu()}
              </div>
            </div>

            {renderContent(false)}
            {renderLikers()}
            
            <div className="mt-3">
              {renderActions(false)}
            </div>
          </div>
        </div>
      )}

      {renderModals()}
    </motion.div>
  );
};

export default PostCard;
