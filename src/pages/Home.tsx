import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Send, MoreHorizontal, Trash2, Edit2, BarChart2, Plus, Heart, Repeat, MessageCircle, ArrowUp, Search, X, Image as ImageIcon, Zap as ZapIcon, Ghost } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc, updateDoc, limit, arrayUnion, arrayRemove, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CreatePostModal from '../components/CreatePostModal';
import Toast from '../components/Toast';
import VerifiedBadge from '../components/VerifiedBadge';
import PostContent from '../components/PostContent';
import QuotedPost from '../components/QuotedPost';
import Poll from '../components/Poll';
import SharePostModal from '../components/SharePostModal';
import ImageViewer from '../components/ImageViewer';
import ConfirmModal from '../components/ConfirmModal';
import PostCard from '../components/PostCard';
import LazyImage from '../components/LazyImage';
import PostSkeleton from '../components/PostSkeleton';
import { handleMentions, sendPushNotification, notifyFollowers } from '../lib/notifications';
import { uploadToImgBB } from '../lib/imgbb';
import { awardPoints } from '../services/gamificationService';
import PullToRefresh from '../components/PullToRefresh';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../lib/dateUtils';
import { getDefaultAvatar } from '../lib/avatar';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


export default function Home() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { openDrawer, openCreateModal } = useOutletContext<{ 
    openDrawer: () => void; 
    openCreateModal: (replyTo?: any, quotePost?: any, isAnonymous?: boolean) => void 
  }>();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [fetchedPosts, setFetchedPosts] = useState<any[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<any[]>([]);
  const [pendingPostsCount, setPendingPostsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isInitialLoadRef = useRef(true);
  const displayedPostsRef = useRef<any[]>([]);

  useEffect(() => {
    displayedPostsRef.current = displayedPosts;
  }, [displayedPosts]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    setDisplayedPosts([]);
    setFetchedPosts([]);
    setPendingPostsCount(0);
  }, [activeTab]);

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenuPostId) {
        setActiveMenuPostId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuPostId]);

  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSharePost, setSelectedSharePost] = useState<any | null>(null);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };
  const [replyToPost, setReplyToPost] = useState<any | null>(null);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  const POSTS_PER_PAGE = 15;

  useEffect(() => {
    if (!db) return;
    
    setIsFetching(true);
    setHasMore(true);
    setLastDoc(null);
    
    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(POSTS_PER_PAGE)
    );

    // If Following tab and user is following people
    if (activeTab === 'following') {
      if (userProfile?.following && userProfile.following.length > 0) {
        // Firestore 'in' query limit is 30.
        const followingIds = userProfile.following.slice(0, 30);
        q = query(
          collection(db, 'posts'),
          where('authorId', 'in', followingIds),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE)
        );
      } else {
        // Not following anyone
        setFetchedPosts([]);
        setIsFetching(false);
        setHasMore(false);
        return;
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFetchedPosts(newPosts);
      
      // Only set lastDoc on initial load or if we haven't loaded more yet
      if (isInitialLoadRef.current && snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
      }
      
      setIsFetching(false);
    }, (error) => {
      console.error("Feed error:", error);
      setIsFetching(false);
      setFetchedPosts([]);
    });

    return () => unsubscribe();
  }, [activeTab, db, userProfile?.following]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDoc || !db) return;

    setIsLoadingMore(true);
    try {
      let q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(POSTS_PER_PAGE)
      );

      if (activeTab === 'following' && userProfile?.following && userProfile.following.length > 0) {
        const followingIds = userProfile.following.slice(0, 30);
        q = query(
          collection(db, 'posts'),
          where('authorId', 'in', followingIds),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(POSTS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const morePosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDisplayedPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueMorePosts = morePosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueMorePosts];
        });
        
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastDoc, activeTab, userProfile?.following]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isFetching) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loadMorePosts, hasMore, isLoadingMore, isFetching]);

  useEffect(() => {
    if (isInitialLoadRef.current) {
      if (fetchedPosts.length > 0) {
        setDisplayedPosts(fetchedPosts);
        setPendingPostsCount(0);
        isInitialLoadRef.current = false;
      } else if (!isFetching) {
        setDisplayedPosts([]);
        isInitialLoadRef.current = false;
      }
      return;
    }

    const current = [...displayedPostsRef.current];
    if (current.length === 0) {
      setDisplayedPosts(fetchedPosts);
      setPendingPostsCount(0);
      return;
    }

    // 1. Identify new posts at the very top
    const currentIds = new Set(current.map(p => p.id));
    const newPostsAtTop = [];
    for (const p of fetchedPosts) {
      if (!currentIds.has(p.id)) {
        newPostsAtTop.push(p);
      } else {
        break;
      }
    }

    // 2. Update existing posts in displayedPosts with fresh data from fetchedPosts
    const fetchedMap = new Map(fetchedPosts.map(p => [p.id, p]));
    const updatedCurrent = current.map(p => fetchedMap.has(p.id) ? fetchedMap.get(p.id) : p);

    const hasMyPost = newPostsAtTop.some(p => p.authorId === userProfile?.uid);

    if (hasMyPost) {
      // Prepend new posts to the current list
      setDisplayedPosts([...newPostsAtTop, ...updatedCurrent]);
      setPendingPostsCount(0);
    } else {
      // Just update existing posts and set pending count
      setDisplayedPosts(updatedCurrent);
      setPendingPostsCount(newPostsAtTop.length);
    }
  }, [fetchedPosts, userProfile?.uid, isFetching]);

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setActiveMenuPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!db || !userProfile || !editContent.trim() || editContent.length > 1000) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editContent.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
      setActiveMenuPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleFollowClick = async (authorId: string, authorName: string, authorPhoto: string | null) => {
    if (!userProfile?.uid || !db || authorId === userProfile.uid) return;
    
    const isFollowing = userProfile.following?.includes(authorId);
    
    if (isFollowing) {
      setConfirmModal({
        isOpen: true,
        title: `Deixar de seguir @${authorName}?`,
        message: `As publicações de @${authorName} não aparecerão mais na sua aba Seguindo.`,
        onConfirm: async () => {
          try {
            await updateDoc(doc(db, 'users', userProfile.uid), {
              following: arrayRemove(authorId)
            });
            await updateDoc(doc(db, 'users', authorId), {
              followers: arrayRemove(userProfile.uid)
            });
            showToast(`Você deixou de seguir @${authorName}`, 'info');
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'users');
          }
        }
      });
      setActiveMenuPostId(null);
      return;
    }

    try {
      // Update current user's following list
      await updateDoc(doc(db, 'users', userProfile.uid), {
        following: arrayUnion(authorId)
      });
      
      // Update target user's followers list
      await updateDoc(doc(db, 'users', authorId), {
        followers: arrayUnion(userProfile.uid)
      });
      
      showToast(`Agora você segue @${authorName}`, 'success');
      
      // Award points for following
      await awardPoints(userProfile.uid, 5);
      
      // Create notification if following
      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      setActiveMenuPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleLikePost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    // Redirect interaction to the original post if it's a repost
    const targetPost = post.type === 'repost' ? { id: post.repostedPostId, ...post } : post;
    const isLiked = targetPost.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', targetPost.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (targetPost.likesCount || 0) - 1) : (targetPost.likesCount || 0) + 1
      });
      
      if (!isLiked) {
        // showToast('Post curtido!', 'success'); // Optional, maybe too noisy
        // Award points for liking
        await awardPoints(userProfile.uid, 5);
      }
      
      if (!isLiked && post.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'like',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp()
        });
        
        // Trigger push notification
        await sendPushNotification(
          post.authorId,
          'Novo Like',
          `${userProfile.displayName} curtiu seu post.`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleRepost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    // We can't repost a repost directly in this simple implementation, 
    // we repost the original post.
    const targetPost = post.type === 'repost' ? { id: post.repostedPostId, ...post } : post;
    const isReposted = targetPost.reposts?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', targetPost.id);
    
    try {
      if (isReposted) {
        // Remove repost
        await updateDoc(postRef, {
          reposts: arrayRemove(userProfile.uid),
          repostsCount: Math.max(0, (targetPost.repostsCount || 0) - 1)
        });

        // Find and delete the repost document
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', userProfile.uid),
          where('repostedPostId', '==', targetPost.id),
          where('type', '==', 'repost'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(doc(db, 'posts', snapshot.docs[0].id));
        }

        showToast('Repost removido', 'info');
      } else {
        // Add repost
        await updateDoc(postRef, {
          reposts: arrayUnion(userProfile.uid),
          repostsCount: (targetPost.repostsCount || 0) + 1
        });

        // Create new repost document
        await addDoc(collection(db, 'posts'), {
          authorId: userProfile.uid,
          ownerId: userProfile.uid,
          authorName: userProfile.displayName,
          authorUsername: userProfile.username,
          authorPhoto: userProfile.photoURL || null,
          authorVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          authorPremiumTier: userProfile.premiumTier || null,
          type: 'repost',
          repostedPostId: targetPost.id,
          // Copy original post data for easy display
          content: targetPost.content || '',
          imageUrls: targetPost.imageUrls || [],
          originalPostAuthorId: targetPost.authorId,
          originalPostAuthorName: targetPost.authorName,
          originalPostAuthorUsername: targetPost.authorUsername,
          originalPostAuthorPhoto: targetPost.authorPhoto || null,
          originalPostAuthorVerified: targetPost.authorVerified || false,
          originalPostAuthorPremiumTier: targetPost.authorPremiumTier || null,
          createdAt: serverTimestamp()
        });

        showToast('Repostado com sucesso!', 'success');
        
        // Award points for reposting
        await awardPoints(userProfile.uid, 10);

        if (targetPost.authorId !== userProfile.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: targetPost.authorId,
            senderId: userProfile.uid,
            senderName: userProfile.displayName,
            senderUsername: userProfile.username,
            senderPhoto: userProfile.photoURL || null,
            senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
            senderPremiumTier: userProfile.premiumTier || null,
            type: 'repost',
            postId: targetPost.id,
            read: false,
            createdAt: serverTimestamp()
          });
          
          // Trigger push notification
          await sendPushNotification(
            targetPost.authorId,
            'Novo Repost',
            `${userProfile.displayName} repostou seu post.`
          );
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const BASE_EDIT_TIME_MINUTES = 15;
  const PREMIUM_EDIT_TIME_MINUTES = 60;

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid && post.ownerId !== userProfile?.uid) return false;

    const isPremium = (userProfile as any)?.isPremium;
    const editLimitMinutes = isPremium ? PREMIUM_EDIT_TIME_MINUTES : BASE_EDIT_TIME_MINUTES;
    
    // If createdAt is null, it's a pending local write, so it was just created
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= editLimitMinutes;
  };

  return (
    <div className="w-full min-h-full bg-transparent relative">
      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between h-12 relative px-1">
            {/* Left Section (Mobile Avatar) */}
            <div className="flex-1 flex items-center justify-start z-10 min-w-0">
              <div className="sm:hidden flex-shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer();
                  }} 
                  className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer border border-white/40 shadow-sm"
                >
                  {userProfile?.photoURL ? (
                    <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                  ) : (
                    <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Liquid Glass Tab Switcher (Center) */}
            <div className="flex-shrink-0 z-10 mx-2">
              <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative overflow-hidden border border-white/40 shadow-lg whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('foryou')}
                  className={`relative px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-300 z-10 flex-shrink-0 ${
                    activeTab === 'foryou' ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'foryou' && (
                    <motion.div
                      layoutId="feed-tab-blob"
                      className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  For you
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`relative px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-300 z-10 flex-shrink-0 ${
                    activeTab === 'following' ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'following' && (
                    <motion.div
                      layoutId="feed-tab-blob"
                      className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  Following
                </button>
              </nav>
            </div>

            {/* Search Toggle & Anonymous Post Buttons (Right) */}
            <div className="flex-1 flex items-center justify-end z-10 space-x-1 sm:space-x-2 min-w-0">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openCreateModal(null, null, true)}
                className="group relative p-2 sm:p-2.5 rounded-full transition-all duration-300 border border-white/40 shadow-sm overflow-hidden flex-shrink-0"
                title="Postar Anonimamente"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-50 via-gray-50 to-blue-50 opacity-100 group-hover:opacity-80 transition-opacity"></div>
                <Ghost className="w-4.5 h-4.5 sm:w-5 h-5 text-gray-500 group-hover:text-black relative z-10" />
              </motion.button>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 border border-white/40 shadow-sm flex-shrink-0 ${isSearchOpen ? 'bg-black text-white' : 'liquid-glass-pill text-gray-500'}`}
              >
                <Search className="w-4.5 h-4.5 sm:w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar (Animated) */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="block w-full pl-11 pr-4 py-3 border border-white/40 rounded-2xl bg-white/60 backdrop-blur-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm shadow-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Posts Banner */}
      <div className="sticky top-[110px] sm:top-[90px] z-20 flex justify-center pointer-events-none w-full">
        <AnimatePresence>
          {pendingPostsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="absolute"
            >
              <button
                onClick={() => {
                  const current = displayedPostsRef.current;
                  const currentIds = new Set(current.map(p => p.id));
                  const newPosts = fetchedPosts.filter(p => !currentIds.has(p.id));
                  setDisplayedPosts([...newPosts, ...current]);
                  setPendingPostsCount(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-black text-white px-5 py-2 rounded-full shadow-lg font-bold text-sm pointer-events-auto hover:bg-gray-800 transition-transform active:scale-95 flex items-center space-x-2"
              >
                <ArrowUp className="w-4 h-4" />
                <span>Mostrar {pendingPostsCount} {pendingPostsCount === 1 ? 'novo post' : 'novos posts'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* Posts List */}
        <div 
          role="tabpanel" 
          id="feed-panel" 
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="focus-visible:outline-none"
        >
          <PullToRefresh onRefresh={async () => {
            const current = displayedPostsRef.current;
            const currentIds = new Set(current.map(p => p.id));
            const newPosts = fetchedPosts.filter(p => !currentIds.has(p.id));
            setDisplayedPosts([...newPosts, ...current]);
            setPendingPostsCount(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isFetching ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <PostSkeleton key={i} />
                  ))}
                </div>
              ) : displayedPosts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-black italic tracking-tighter text-gray-900 mb-1">Nenhum post ainda</h3>
                  <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                    Seja o primeiro a compartilhar algo com o mundo!
                  </p>
                </div>
              ) : (
                <div className="px-4 space-y-4 pb-20">
                  {(() => {
                    const filtered = displayedPosts.filter(post => {
                      const isMuted = userProfile?.mutedUsers?.includes(post.authorId);
                      const isBlocked = userProfile?.blockedUsers?.includes(post.authorId);
                      if (isMuted || isBlocked) return false;

                      return post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        post.authorUsername.toLowerCase().includes(searchQuery.toLowerCase());
                    });
                    
                    if (filtered.length === 0 && searchQuery) {
                      return (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-300" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum resultado</h3>
                          <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                            Não encontramos nenhum post com "{searchQuery}"
                          </p>
                        </div>
                      );
                    }
                    
                    const elements = [];
                    let adIndex = 0;

                    filtered.forEach((post, index) => {
                      elements.push(
                        <PostCard
                          key={post.id}
                          post={post}
                          onLike={handleLikePost}
                          onRepost={handleRepost}
                          onDelete={handleDeletePost}
                          onEdit={(p) => {
                            setEditingPost(p);
                            setEditContent(p.content);
                          }}
                          onShare={(p) => {
                            setSelectedSharePost(p);
                            setIsShareModalOpen(true);
                          }}
                          onReply={(p) => openCreateModal(p)}
                          onQuote={(p) => openCreateModal(null, p)}
                          onImageClick={openImageViewer}
                          canEdit={canEditPost}
                        />
                      );

                      // Insert a Google Ad every 2 posts
                      // if ((index + 1) % 2 === 0) {
                      //   elements.push(<GoogleAd key={`google-ad-${index}`} slotId="9395334432" />);
                      // }
                    });

                    return (
                      <>
                        {elements}
                        {/* Intersection Observer Sentinel */}
                        <div ref={loaderRef} className="h-10 flex items-center justify-center">
                          {isLoadingMore && (
                            <div className="flex space-x-1">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                                  style={{ animationDelay: `${i * 0.1}s` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </PullToRefresh>
        </div>


        <SharePostModal 
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedSharePost(null);
          }}
          post={selectedSharePost}
        />
        <Toast 
          message={toast.message}
          type={toast.type}
          isOpen={toast.isOpen}
          onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
        />
        <ImageViewer 
          src={viewerImage?.src || null}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          alt={viewerImage?.alt}
        />
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
        />
    </div>
  );
}
