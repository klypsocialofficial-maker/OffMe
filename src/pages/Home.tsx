import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Send, MoreHorizontal, Trash2, Edit2, BarChart2, Plus, Heart, Repeat, MessageCircle, ArrowUp, Search, X, Image as ImageIcon, Zap as ZapIcon } from 'lucide-react';
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
import { uploadToImgBB } from '../lib/imgbb';
import PullToRefresh from '../components/PullToRefresh';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../lib/dateUtils';

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

const PostSkeleton = () => (
  <div className="p-4 liquid-glass-card rounded-2xl shadow-sm overflow-hidden mb-4 mx-4">
    <div className="flex space-x-3">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0 shimmer" />
      <div className="flex-1 space-y-3 py-1">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 shimmer" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16 shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full shimmer" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 shimmer" />
        </div>
        <div className="flex justify-between max-w-md pt-2">
          <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-full shimmer" />
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { openDrawer, openCreateModal } = useOutletContext<{ openDrawer: () => void; openCreateModal: (replyTo?: any, quotePost?: any) => void }>();
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

  const [newPost, setNewPost] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };
  const [replyToPost, setReplyToPost] = useState<any | null>(null);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  useEffect(() => {
    if (!db) return;
    
    setIsFetching(true);
    
    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
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
          limit(50)
        );
      } else {
        // Not following anyone
        setFetchedPosts([]);
        setIsFetching(false);
        return;
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFetchedPosts(newPosts);
      setIsFetching(false);
    }, (error) => {
      console.error("Feed error:", error);
      setIsFetching(false);
      setFetchedPosts([]);
    });

    return () => unsubscribe();
  }, [activeTab, db, userProfile?.following]);

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

    const current = displayedPostsRef.current;
    if (current.length === 0) {
      setDisplayedPosts(fetchedPosts);
      setPendingPostsCount(0);
      return;
    }

    const currentIds = new Set(current.map(p => p.id));
    const newPostsAtTop = [];
    for (const p of fetchedPosts) {
      if (!currentIds.has(p.id)) {
        newPostsAtTop.push(p);
      } else {
        break;
      }
    }

    const hasMyPost = newPostsAtTop.some(p => p.authorId === userProfile?.uid);

    if (hasMyPost) {
      setDisplayedPosts(fetchedPosts);
      setPendingPostsCount(0);
    } else {
      setPendingPostsCount(newPostsAtTop.length);
      
      const fetchedMap = new Map(fetchedPosts.map(p => [p.id, p]));
      const nextDisplayed = current
        .filter(p => fetchedMap.has(p.id))
        .map(p => fetchedMap.get(p.id));
        
      setDisplayedPosts(nextDisplayed);
    }
  }, [fetchedPosts, userProfile?.uid, isFetching]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !imageFile) || !userProfile || !db) return;

    try {
      setLoading(true);
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadToImgBB(imageFile);
      }

      await addDoc(collection(db, 'posts'), {
        content: newPost.trim(),
        imageUrl,
        authorId: userProfile.uid,
        authorName: userProfile.displayName || '',
        authorUsername: userProfile.username || '',
        authorPhoto: userProfile.photoURL || '',
        authorVerified: userProfile.isVerified || userProfile.username === 'Rulio' || false,
        createdAt: serverTimestamp(),
        likesCount: 0,
        repliesCount: 0,
        repostsCount: 0,
        likes: [],
        reposts: []
      });
      setNewPost('');
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    
    try {
      // Update current user's following list
      await updateDoc(doc(db, 'users', userProfile.uid), {
        following: isFollowing ? arrayRemove(authorId) : arrayUnion(authorId)
      });
      
      // Update target user's followers list
      await updateDoc(doc(db, 'users', authorId), {
        followers: isFollowing ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid)
      });
      
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
    
    const isLiked = post.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', post.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (post.likesCount || 0) - 1) : (post.likesCount || 0) + 1
      });
      
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
        fetch('/api/send-push-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: post.authorId,
            title: 'Novo Like',
            body: `${userProfile.displayName} curtiu seu post.`
          })
        }).catch(console.error);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleRepost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    const isReposted = post.reposts?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', post.id);
    
    try {
      await updateDoc(postRef, {
        reposts: isReposted ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        repostsCount: isReposted ? Math.max(0, (post.repostsCount || 0) - 1) : (post.repostsCount || 0) + 1
      });
      
      if (!isReposted && post.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'repost',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid) return false;
    if ((userProfile as any)?.isPremium) return true;
    
    // If createdAt is null, it's a pending local write, so it was just created
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= 3;
  };

  return (
    <div className="w-full h-full bg-transparent relative">
      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 z-30 pt-[calc(0.5rem+env(safe-area-inset-top))] flex flex-col items-center">
        {/* Feed Header & Tabs - Floating Pill Style */}
        <div className="w-full max-w-md px-4 py-2">
          <div className="flex items-center justify-between relative">
            {/* Mobile Avatar (Left) */}
            <div className="sm:hidden flex-shrink-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer();
                }} 
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 cursor-pointer border border-white/40 dark:border-white/10 shadow-sm"
              >
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-full h-full p-2 text-gray-400" />
                )}
              </button>
            </div>

            {/* Liquid Glass Tab Switcher (Center) */}
            <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative overflow-hidden border border-white/40 dark:border-white/10 shadow-lg">
              <button
                onClick={() => setActiveTab('foryou')}
                className={`relative px-6 py-2 text-sm font-bold transition-all duration-300 z-10 ${
                  activeTab === 'foryou' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {activeTab === 'foryou' && (
                  <motion.div
                    layoutId="feed-tab-blob"
                    className="absolute inset-0 bg-white/80 dark:bg-white/10 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                For you
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`relative px-6 py-2 text-sm font-bold transition-all duration-300 z-10 ${
                  activeTab === 'following' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {activeTab === 'following' && (
                  <motion.div
                    layoutId="feed-tab-blob"
                    className="absolute inset-0 bg-white/80 dark:bg-white/10 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                Following
              </button>
            </nav>

            {/* Search Toggle Button (Right) */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2.5 rounded-full transition-all duration-300 border border-white/40 dark:border-white/10 shadow-sm ${isSearchOpen ? 'bg-black text-white' : 'liquid-glass-pill text-gray-500 dark:text-gray-400'}`}
            >
              <Search className="w-5 h-5" />
            </button>
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
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="block w-full pl-11 pr-4 py-3 border border-white/40 dark:border-white/10 rounded-2xl bg-white/60 dark:bg-black/60 backdrop-blur-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm shadow-sm"
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
                  setDisplayedPosts(fetchedPosts);
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

      {/* Inline Post Input (Desktop/Tablet) */}
      <div className="hidden sm:block px-4 py-4 border-b border-gray-100/50 bg-white/40 backdrop-blur-md">
        <div className="flex space-x-4">
          <div 
            className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100 cursor-zoom-in"
            onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
          >
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-2 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="O que está acontecendo?"
              className="w-full bg-transparent text-lg outline-none resize-none min-h-[60px] placeholder-gray-400 py-2"
            />
            
            {imagePreview && (
              <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group inline-block">
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                <img src={imagePreview} alt="Preview" className="max-h-80 w-auto rounded-2xl object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
              <div className="flex items-center space-x-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-black hover:bg-black/5 rounded-full transition-colors"
                  title="Adicionar imagem"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={(!newPost.trim() && !imageFile) || loading || newPost.length > 1000}
                className="bg-black text-white px-6 py-2 rounded-full font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:text-white transition-all active:scale-95"
              >
                {loading ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Posts List */}
        <div 
          role="tabpanel" 
          id="feed-panel" 
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="focus-visible:outline-none pt-4"
        >
          <PullToRefresh onRefresh={async () => {
            setDisplayedPosts(fetchedPosts);
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum post ainda</h3>
                  <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                    Seja o primeiro a compartilhar algo com o mundo!
                  </p>
                </div>
              ) : (
                <div className="px-4 space-y-4 pb-20">
                  {(() => {
                    const filtered = displayedPosts.filter(post => 
                      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      post.authorUsername.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
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
                    
                    return filtered.map((post) => {
                      return (
                        <motion.article 
                          key={post.id} 
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="group relative p-4 liquid-glass-card rounded-2xl shadow-sm hover:bg-white/80 dark:hover:bg-black/80 transition-all cursor-pointer flex space-x-4"
                        >
                    {/* Quick Actions Hover Overlay */}
                    <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-100 p-1 z-10">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(null, post);
                        }}
                        className="p-2 hover:bg-black/5 text-gray-500 hover:text-black rounded-full transition-colors"
                        title="Citar"
                      >
                        <ZapIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(post);
                        }}
                        className="p-2 hover:bg-black/5 text-gray-500 hover:text-black rounded-full transition-colors"
                        title="Responder"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepost(post);
                        }}
                        className={`p-2 rounded-full transition-colors ${post.reposts?.includes(userProfile?.uid) ? 'bg-green-50 text-green-500' : 'hover:bg-green-50 text-gray-500 hover:text-green-500'}`}
                        title="Repostar"
                      >
                        <Repeat className="w-4 h-4" />
                      </button>
                      <motion.button
                        whileTap={{ scale: 1.3 }}
                        animate={{ scale: post.likes?.includes(userProfile?.uid) ? 1.1 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikePost(post);
                        }}
                        className={`p-2 rounded-full transition-colors ${post.likes?.includes(userProfile?.uid) ? 'bg-red-50 text-red-500' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                        title="Curtir"
                      >
                        <Heart className={`w-4 h-4 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                      </motion.button>
                    </div>

                    <div 
                      className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.authorPhoto) {
                          openImageViewer(post.authorPhoto, `Avatar de ${post.authorName}`);
                        } else {
                          navigate(`/profile/${post.authorId}`);
                        }
                      }}
                    >
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="flex items-center space-x-1 min-w-0 cursor-pointer flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.authorId}`);
                        }}
                      >
                        <span className="font-bold truncate hover:underline flex-shrink-0 max-w-[120px] sm:max-w-[180px]">{post.authorName}</span>
                        {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge className="w-4 h-4 flex-shrink-0" tier={post.authorPremiumTier} />}
                        <span className="text-gray-500 truncate flex-shrink min-w-0">@{post.authorUsername}</span>
                        <span className="text-gray-500 flex-shrink-0">·</span>
                        <span className="text-gray-500 text-sm flex-shrink-0">
                          {post.createdAt?.toDate ? formatRelativeTime(post.createdAt.toDate()) : 'Agora'}
                        </span>
                        {post.isEdited && <span className="text-gray-400 text-xs flex-shrink-0">(editado)</span>}
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                          }}
                          className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-500 hover:text-black"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {activeMenuPostId === post.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                            {post.authorId === userProfile?.uid ? (
                              <>
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Apagar post</span>
                                </button>
                                
                                <button 
                                  onClick={() => {
                                    if (canEditPost(post)) {
                                      setEditingPost(post);
                                      setEditContent(post.content);
                                      setActiveMenuPostId(null);
                                    } else {
                                      showToast('O tempo de edição (3 minutos) expirou. Assine o Premium para editar a qualquer momento.', 'info');
                                      setActiveMenuPostId(null);
                                    }
                                  }}
                                  className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEditPost(post) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                  <span>Editar post</span>
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleFollowClick(post.authorId, post.authorName, post.authorPhoto)}
                                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <UserIcon className="w-4 h-4" />
                                <span>{userProfile?.following?.includes(post.authorId) ? 'Deixar de seguir' : 'Seguir'} @{post.authorUsername}</span>
                              </button>
                            )}
                            
                            <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedSharePost(post);
                                 setIsShareModalOpen(true);
                                 setActiveMenuPostId(null);
                               }}
                               className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                             >
                               <Send className="w-4 h-4" />
                               <span>Compartilhar post</span>
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {editingPost?.id === post.id ? (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          maxLength={1000}
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none resize-none min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex justify-between items-center mt-2">
                          <div className={`text-xs font-medium ${editContent.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                            {editContent.length} / 1000
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setEditingPost(null)}
                              className="px-4 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleEditPost(post.id)}
                              disabled={!editContent.trim() || editContent === post.content || editContent.length > 1000}
                              className="bg-black text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {post.replyToUsername && (
                          <div className="mt-1 text-sm text-gray-500">
                            Respondendo a <span className="text-black">@{post.replyToUsername}</span>
                          </div>
                        )}
                        <PostContent content={post.content} className="mt-1 text-gray-900" />
                    {post.quotedPostId && <QuotedPost post={post} />}
                        {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                        
                        {post.poll && (
                          <Poll post={post} handleFirestoreError={handleFirestoreError} OperationType={OperationType} />
                        )}

                        {post.imageUrl && (
                          <div 
                            className="mt-3 rounded-2xl overflow-hidden border border-gray-200 cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              openImageViewer(post.imageUrl, `Imagem do post de ${post.authorName}`);
                            }}
                          >
                            <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-96 object-cover" />
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between mt-4 text-gray-500 max-w-md">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(post);
                        }}
                        className="flex items-center space-x-2 hover:text-black transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-black/5 rounded-full">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <span className="text-sm">{post.repliesCount || 0}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepost(post);
                        }}
                        className={`flex items-center space-x-2 transition-colors group ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
                      >
                        <motion.div 
                          whileTap={{ scale: 0.8 }}
                          className="p-2 group-hover:bg-green-50 rounded-full"
                        >
                          <Repeat className={`w-5 h-5 ${post.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
                        </motion.div>
                        <span className="text-sm">{post.repostsCount || 0}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikePost(post);
                        }}
                        className={`flex items-center space-x-2 transition-colors group ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                      >
                        <motion.div 
                          whileTap={{ scale: 0.8 }}
                          className="p-2 group-hover:bg-red-50 rounded-full"
                        >
                          <Heart className={`w-5 h-5 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                        </motion.div>
                        <span className="text-sm">{post.likesCount || 0}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSharePost(post);
                          setIsShareModalOpen(true);
                        }}
                        className="flex items-center space-x-2 hover:text-black transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-black/5 rounded-full">
                          <Send className="w-5 h-5" />
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.article>
                );
              })
            })()}
          </div>
        )}
            </motion.div>
          </AnimatePresence>
          </PullToRefresh>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="sm:hidden fixed bottom-32 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-900 transition-colors z-[100] mobile-fab transition-all duration-300"
        >
          <Plus className="w-6 h-6" />
        </button>

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
    </div>
  );
}
