import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Send, Image as ImageIcon, MoreHorizontal, Trash2, Edit2, BarChart2, Plus, Search, Filter, Calendar, X, Heart, Repeat, MessageCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc, updateDoc, limit, arrayUnion, arrayRemove, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CreatePostModal from '../components/CreatePostModal';
import VerifiedBadge from '../components/VerifiedBadge';
import { uploadToImgBB } from '../lib/imgbb';
import { motion, AnimatePresence } from 'motion/react';

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
  <div className="p-4 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 overflow-hidden mb-4 mx-4">
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
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedStatsPost, setSelectedStatsPost] = useState<any>(null);
  const [replyToPost, setReplyToPost] = useState<any | null>(null);

  // Infinite Scroll State
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(async (isInitial = false) => {
    if (!db) return;
    
    try {
      let q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (!isInitial && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setPosts(prev => isInitial ? newPosts : [...prev, ...newPosts]);
      setIsFetching(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setIsFetching(false);
    }
  }, [lastVisible]);

  useEffect(() => {
    setPosts([]);
    setLastVisible(null);
    setHasMore(true);
    setIsFetching(true);
    fetchPosts(true);
  }, [activeTab]); // Re-fetch when tab changes

  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetching) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [isFetching, hasMore, fetchPosts]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !userProfile || !db) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL,
        createdAt: serverTimestamp(),
        likesCount: 0,
        repliesCount: 0,
        repostsCount: 0,
        likes: [],
        reposts: []
      });
      setNewPost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    // Keyword filter
    if (searchKeyword && !post.content.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    // Author filter
    if (searchAuthor && !(
      post.authorName.toLowerCase().includes(searchAuthor.toLowerCase()) || 
      post.authorUsername.toLowerCase().includes(searchAuthor.toLowerCase())
    )) {
      return false;
    }
    // Date range filter
    if (startDate || endDate) {
      const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date();
      if (startDate && postDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (postDate > end) return false;
      }
    }
    return true;
  });

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
    if (!db || !userProfile || !editContent.trim()) return;
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
          type: 'like',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp()
        });
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
    <div className="w-full h-full bg-white/50 relative">
      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 pt-[calc(0.5rem+env(safe-area-inset-top))] border-b border-gray-100/50">

        {/* Mobile Top Bar (Avatar Only) */}
        <div className="flex items-center px-4 pb-2 sm:hidden">
          <button onClick={openDrawer} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex w-full border-b border-gray-100/50" role="tablist" aria-label="Feed tabs">
          <button 
            role="tab"
            aria-selected={activeTab === 'foryou'}
            aria-controls="feed-panel"
            id="tab-foryou"
            tabIndex={activeTab === 'foryou' ? 0 : -1}
            onClick={() => setActiveTab('foryou')} 
            className={`flex-1 hover:bg-black/5 transition-colors relative py-4 text-center font-bold focus-visible:outline-none focus-visible:bg-black/5 ${activeTab === 'foryou' ? 'text-black' : 'text-gray-500'}`}
          >
            Para você
            {activeTab === 'foryou' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === 'following'}
            aria-controls="feed-panel"
            id="tab-following"
            tabIndex={activeTab === 'following' ? 0 : -1}
            onClick={() => setActiveTab('following')} 
            className={`flex-1 hover:bg-black/5 transition-colors relative py-4 text-center font-bold focus-visible:outline-none focus-visible:bg-black/5 ${activeTab === 'following' ? 'text-black' : 'text-gray-500'}`}
          >
            Seguindo
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 hover:bg-black/5 transition-colors flex items-center justify-center ${showFilters ? 'text-blue-500' : 'text-gray-500'}`}
            title="Filtros"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white/60 backdrop-blur-md border-b border-gray-100"
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Keyword Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Palavras-chave..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all"
                    />
                    {searchKeyword && (
                      <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Author Search */}
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Autor (@usuario ou nome)..."
                      value={searchAuthor}
                      onChange={(e) => setSearchAuthor(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all"
                    />
                    {searchAuthor && (
                      <button onClick={() => setSearchAuthor('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Start */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 flex items-center space-x-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">De:</span>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Date End */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 flex items-center space-x-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">Até:</span>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {(searchKeyword || searchAuthor || startDate || endDate) && (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => {
                        setSearchKeyword('');
                        setSearchAuthor('');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
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
          className="focus-visible:outline-none pt-4"
        >
          {isFetching ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchKeyword || searchAuthor || startDate || endDate 
                ? "Nenhum post corresponde aos seus filtros."
                : (activeTab === 'foryou' 
                    ? "Nenhum post ainda. Seja o primeiro a postar!"
                    : "Você ainda não segue ninguém ou eles não postaram nada.")}
            </div>
          ) : (
            <div className="px-4 space-y-4 pb-20">
              {filteredPosts.map((post, index) => {
                const isLastPost = filteredPosts.length === index + 1;
                return (
                  <article 
                    key={post.id} 
                    ref={isLastPost ? lastPostElementRef : null}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="group relative p-4 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 hover:bg-white/80 transition-all cursor-pointer flex space-x-4"
                  >
                    {/* Quick Actions Hover Overlay */}
                    <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-100 p-1 z-10">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyToPost(post);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-2 hover:bg-blue-50 text-gray-500 hover:text-blue-500 rounded-full transition-colors"
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
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikePost(post);
                        }}
                        className={`p-2 rounded-full transition-colors ${post.likes?.includes(userProfile?.uid) ? 'bg-red-50 text-red-500' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                        title="Curtir"
                      >
                        <Heart className={`w-4 h-4 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div 
                      className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.authorId}`);
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
                        className="flex items-center space-x-1 min-w-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.authorId}`);
                        }}
                      >
                        <span className="font-bold truncate hover:underline">{post.authorName}</span>
                        {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        <span className="text-gray-500 truncate">@{post.authorUsername}</span>
                        {post.authorId !== userProfile?.uid && (
                          <>
                            <span className="text-gray-500">·</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowClick(post.authorId, post.authorName, post.authorPhoto);
                              }}
                              className={`text-sm font-bold hover:underline ${userProfile?.following?.includes(post.authorId) ? 'text-gray-500' : 'text-blue-500'}`}
                            >
                              {userProfile?.following?.includes(post.authorId) ? 'Seguindo' : 'Seguir'}
                            </button>
                          </>
                        )}
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 text-sm">
                          {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Agora mesmo'}
                        </span>
                        {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-full transition-colors text-gray-500 hover:text-blue-500"
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
                                      alert('O tempo de edição (3 minutos) expirou. Assine o Premium para editar a qualquer momento.');
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
                              onClick={() => {
                                if (userProfile?.isPremium) {
                                  setSelectedStatsPost(post);
                                  setIsStatsModalOpen(true);
                                  setActiveMenuPostId(null);
                                } else {
                                  alert('Estatísticas avançadas são um recurso Premium. Assine para ver o desempenho dos seus posts!');
                                  setActiveMenuPostId(null);
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <BarChart2 className="w-4 h-4" />
                              <span>Ver estatísticas</span>
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
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none resize-none min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button 
                            onClick={() => setEditingPost(null)}
                            className="px-4 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleEditPost(post.id)}
                            disabled={!editContent.trim() || editContent === post.content}
                            className="bg-black text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {post.replyToUsername && (
                          <div className="mt-1 text-sm text-gray-500">
                            Respondendo a <span className="text-blue-500">@{post.replyToUsername}</span>
                          </div>
                        )}
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
                        {post.imageUrl && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-96 object-cover" />
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between mt-4 text-gray-500 max-w-md">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyToPost(post);
                          setIsCreateModalOpen(true);
                        }}
                        className="flex items-center space-x-2 hover:text-blue-500 transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-blue-50 rounded-full">
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
                          if (userProfile?.isPremium) {
                            setSelectedStatsPost(post);
                            setIsStatsModalOpen(true);
                          } else {
                            alert('Estatísticas avançadas são um recurso Premium. Assine para ver o desempenho dos seus posts!');
                          }
                        }}
                        className="flex items-center space-x-2 hover:text-blue-500 transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-blue-50 rounded-full">
                          <BarChart2 className="w-5 h-5" />
                        </div>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Share functionality could be added here
                        }}
                        className="flex items-center space-x-2 hover:text-blue-500 transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-blue-50 rounded-full">
                          <Send className="w-5 h-5" />
                        </div>
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
        </div>
      )}
    </div>

        {/* Mobile FAB */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={() => {
            setIsCreateModalOpen(false);
            setReplyToPost(null);
          }} 
          userProfile={userProfile}
          handleFirestoreError={handleFirestoreError}
          OperationType={OperationType}
          replyTo={replyToPost}
        />

        {/* Stats Modal */}
        <AnimatePresence>
          {isStatsModalOpen && selectedStatsPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Estatísticas Avançadas</h3>
                  <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    Premium
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Visualizações</p>
                      <p className="text-xl font-bold">{(selectedStatsPost.likesCount || 0) * 12 + (selectedStatsPost.repostsCount || 0) * 25 + 142}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Engajamento</p>
                      <p className="text-xl font-bold text-blue-600">
                        {(((selectedStatsPost.likesCount || 0) + (selectedStatsPost.repostsCount || 0) + (selectedStatsPost.repliesCount || 0)) / 10 + 2.4).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <UserIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">Cliques no perfil</span>
                      </div>
                      <span className="font-bold">{(selectedStatsPost.likesCount || 0) * 2 + 3}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <Repeat className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">Alcance orgânico</span>
                      </div>
                      <span className="font-bold">94%</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Este post está performando <span className="font-bold">15% melhor</span> que a média dos seus posts recentes.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsStatsModalOpen(false);
                    setSelectedStatsPost(null);
                  }}
                  className="mt-8 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                >
                  Fechar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
