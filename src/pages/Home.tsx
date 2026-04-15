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
import PostCard from '../components/PostCard';
import GoogleAd from '../components/GoogleAd';
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
  <div className="p-4 liquid-glass-card rounded-2xl shadow-sm overflow-hidden mb-4">
    <div className="flex space-x-3">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 shimmer" />
      <div className="flex-1 space-y-3 py-1">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-24 shimmer" />
          <div className="h-4 bg-gray-200 rounded w-16 shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full shimmer" />
          <div className="h-4 bg-gray-200 rounded w-5/6 shimmer" />
        </div>
        <div className="flex justify-between max-w-md pt-2">
          <div className="h-8 w-8 bg-gray-100 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 rounded-full shimmer" />
          <div className="h-8 w-8 bg-gray-100 rounded-full shimmer" />
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
    <div className="w-full min-h-full bg-transparent relative">
      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-3xl border-b border-white/10 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between relative">
            {/* Mobile Avatar (Left) */}
            <div className="sm:hidden flex-shrink-0 z-10">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer();
                }} 
                className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer border border-white/40 shadow-sm"
              >
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-full h-full p-2 text-gray-400" />
                )}
              </button>
            </div>

            {/* Liquid Glass Tab Switcher (Center) */}
            <div className="flex-1 flex justify-center">
              <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative overflow-hidden border border-white/40 shadow-lg">
                <button
                  onClick={() => setActiveTab('foryou')}
                  className={`relative px-4 py-1.5 text-sm font-bold transition-all duration-300 z-10 ${
                    activeTab === 'foryou' ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'foryou' && (
                    <motion.div
                      layoutId="feed-tab-blob"
                      className="absolute inset-0 bg-white/80 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  For you
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`relative px-4 py-1.5 text-sm font-bold transition-all duration-300 z-10 ${
                    activeTab === 'following' ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'following' && (
                    <motion.div
                      layoutId="feed-tab-blob"
                      className="absolute inset-0 bg-white/80 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  Following
                </button>
              </nav>
            </div>

            {/* Search Toggle Button (Right) */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2.5 rounded-full transition-all duration-300 border border-white/40 shadow-sm z-10 ${isSearchOpen ? 'bg-black text-white' : 'liquid-glass-pill text-gray-500'}`}
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

        {/* Posts List */}
        <div 
          role="tabpanel" 
          id="feed-panel" 
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="focus-visible:outline-none"
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
                      if ((index + 1) % 2 === 0) {
                        elements.push(<GoogleAd key={`google-ad-${index}`} slotId="9395334432" />);
                      }
                    });

                    return elements;
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
    </div>
  );
}
