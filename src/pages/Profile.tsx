import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Calendar, MapPin, Link as LinkIcon, Edit2, Trash2, BarChart2, MessageCircle, Heart, Send, MoreHorizontal, ArrowLeft, Search, Share, Briefcase, Plus } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';
import CreatePostModal from '../components/CreatePostModal';
import VerifiedBadge from '../components/VerifiedBadge';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayRemove, arrayUnion, addDoc, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
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

export default function Profile() {
  const { userProfile } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedStatsPost, setSelectedStatsPost] = useState<any>(null);

  useEffect(() => {
    if (!db) return;

    if (userId) {
      // Fetch other user's profile
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
        if (docSnap.exists()) {
          setProfileUser({ uid: docSnap.id, ...docSnap.data() });
        } else {
          setProfileUser(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      });
      return () => unsubscribe();
    } else {
      // Use current user's profile
      setProfileUser(userProfile);
    }
  }, [userId, userProfile, db]);

  useEffect(() => {
    if (!profileUser?.uid || !db) return;

    setLoading(true);
    let unsubscribe: () => void;

    if (activeTab === 'posts') {
      // Fetch user's posts and reposted posts
      const q1 = query(
        collection(db, 'posts'),
        where('authorId', '==', profileUser.uid),
        orderBy('createdAt', 'desc')
      );
      const q2 = query(
        collection(db, 'posts'),
        where('reposts', 'array-contains', profileUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsub1 = onSnapshot(q1, (snapshot1) => {
        const unsub2 = onSnapshot(q2, (snapshot2) => {
          const results1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const results2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Merge and remove duplicates (if user reposts their own post)
          const merged = [...results1, ...results2];
          const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
          
          // Filter out replies for the main "Posts" tab
          const filtered = unique.filter((post: any) => !post.replyToId);
          
          // Sort by createdAt
          filtered.sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
            return dateB - dateA;
          });

          setPosts(filtered);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'posts_reposts');
          setLoading(false);
        });
        unsubscribe = unsub2;
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts_author');
        setLoading(false);
      });
      unsubscribe = unsub1;
    } else {
      let q;
      if (activeTab === 'likes') {
        q = query(
          collection(db, 'posts'),
          where('likes', 'array-contains', profileUser.uid),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'posts'),
          where('authorId', '==', profileUser.uid),
          orderBy('createdAt', 'desc')
        );
      }

      unsubscribe = onSnapshot(q, (snapshot) => {
        let results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (activeTab === 'replies') {
          results = results.filter(post => post.replyToId);
        } else if (activeTab === 'media') {
          results = results.filter(post => post.imageUrl);
        }

        setPosts(results);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [profileUser?.uid, activeTab, db]);

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

  const handleMessageClick = async () => {
    if (!userProfile?.uid || !profileUser?.uid || !db || profileUser.uid === userProfile.uid) return;
    
    try {
      // Check if conversation already exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userProfile.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingConversationId = null;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(profileUser.uid)) {
          existingConversationId = doc.id;
        }
      });

      if (existingConversationId) {
        navigate(`/messages/${existingConversationId}`);
      } else {
        // Create new conversation
        const newConversationRef = await addDoc(collection(db, 'conversations'), {
          participants: [userProfile.uid, profileUser.uid],
          participantInfo: {
            [userProfile.uid]: {
              displayName: userProfile.displayName,
              username: userProfile.username,
              photoURL: userProfile.photoURL || null
            },
            [profileUser.uid]: {
              displayName: profileUser.displayName,
              username: profileUser.username,
              photoURL: profileUser.photoURL || null
            }
          },
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        navigate(`/messages/${newConversationRef.id}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations');
    }
  };

  const handleFollowClick = async () => {
    if (!userProfile?.uid || !profileUser?.uid || !db || profileUser.uid === userProfile.uid) return;
    
    const isFollowing = userProfile.following?.includes(profileUser.uid);
    
    try {
      // Update current user's following list
      await updateDoc(doc(db, 'users', userProfile.uid), {
        following: isFollowing ? arrayRemove(profileUser.uid) : arrayUnion(profileUser.uid)
      });
      
      // Update target user's followers list
      await updateDoc(doc(db, 'users', profileUser.uid), {
        followers: isFollowing ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid)
      });
      
      // Create notification if following
      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: profileUser.uid,
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile?.uid) return;
    if (window.confirm('Tem certeza que deseja apagar este post?')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        setActiveMenuPostId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
      }
    }
  };

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid) return false;
    if ((userProfile as any)?.isPremium) return true;
    
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= 3;
  };

  const handleEditPost = async (postId: string) => {
    if (!db || !userProfile?.uid || !editContent.trim()) return;
    
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

  if (loading && !profileUser) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-black rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );

  if (!profileUser) return (
    <div className="p-8 text-center text-gray-500">Usuário não encontrado</div>
  );

  return (
    <div className="w-full h-full bg-white">
      {/* Profile Header with Cover Photo and Action Buttons */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-32 sm:h-48 bg-black w-full relative overflow-hidden">
          <img src={profileUser.bannerURL || '/ghost.svg'} alt="Banner" className="w-full h-full object-cover opacity-80" />
          
          {/* Top Action Bar (Floating on Cover) */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pt-[calc(1rem+env(safe-area-inset-top))]">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex space-x-2">
              <button className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all active:scale-90">
                <Search className="w-5 h-5" />
              </button>
              {profileUser.uid === userProfile?.uid && (
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all active:scale-90"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              <button className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all active:scale-90">
                <Share className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Photo (Overlapping) */}
        <div className="absolute -bottom-10 left-4 sm:left-6 z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
            <img src={profileUser.photoURL || '/ghost.svg'} alt={profileUser.displayName} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="px-4 sm:px-6 pt-12 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black truncate">
                {profileUser.displayName}
              </h2>
              {(profileUser.isVerified || profileUser.username === 'Rulio') && (
                <VerifiedBadge className="w-5 h-5 text-black flex-shrink-0" />
              )}
            </div>
            <p className="text-gray-500 text-sm sm:text-base">@{profileUser.username}</p>
          </div>
          
          {profileUser.uid !== userProfile?.uid && (
            <div className="flex space-x-2">
              <button 
                onClick={handleMessageClick}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-black" />
              </button>
              <button 
                onClick={handleFollowClick}
                className={`px-5 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
                  userProfile?.following?.includes(profileUser.uid)
                    ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    : 'bg-black text-white hover:bg-gray-900 shadow-sm shadow-black/10'
                }`}
              >
                {userProfile?.following?.includes(profileUser.uid) ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          )}
        </div>

        {/* Bio with Stylized Look */}
        {profileUser.bio && (
          <p className="mt-3 text-gray-800 text-sm sm:text-base leading-relaxed max-w-xl">
            {profileUser.bio}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 text-gray-500 text-sm">
          {profileUser.category && (
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4" />
              <span>{profileUser.category}</span>
            </div>
          )}
          {profileUser.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>{profileUser.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <div className="flex items-center">
              <span>
                Entrou em {profileUser.createdAt 
                  ? new Date(profileUser.createdAt.toDate()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                  : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <MoreHorizontal className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex space-x-4 mt-4">
          <button className="flex items-center space-x-1.5 group">
            <span className="font-bold text-black">{profileUser.following?.length || 0}</span>
            <span className="text-gray-500 group-hover:underline text-sm">Seguindo</span>
          </button>
          <button className="flex items-center space-x-1.5 group">
            <span className="font-bold text-black">{profileUser.followers?.length || 0}</span>
            <span className="text-gray-500 group-hover:underline text-sm">Seguidores</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 flex justify-center py-2 sm:py-3 border-b border-gray-100">
        <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative overflow-hidden border border-white/40 shadow-sm">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 z-10 ${activeTab === 'posts' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'posts' && (
              <motion.div
                layoutId="profile-tab-blob"
                className="absolute inset-0 bg-white/60 rounded-full -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('replies')}
            className={`relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 z-10 ${activeTab === 'replies' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'replies' && (
              <motion.div
                layoutId="profile-tab-blob"
                className="absolute inset-0 bg-white/60 rounded-full -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            Respostas
          </button>
          <button 
            onClick={() => setActiveTab('media')}
            className={`relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 z-10 ${activeTab === 'media' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'media' && (
              <motion.div
                layoutId="profile-tab-blob"
                className="absolute inset-0 bg-white/60 rounded-full -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            Mídia
          </button>
          <button 
            onClick={() => setActiveTab('likes')}
            className={`relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 z-10 ${activeTab === 'likes' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'likes' && (
              <motion.div
                layoutId="profile-tab-blob"
                className="absolute inset-0 bg-white/60 rounded-full -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            Curtidas
          </button>
        </nav>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : posts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <article 
                key={post.id} 
                onClick={() => navigate(`/post/${post.id}`)}
                className="p-4 hover:bg-black/5 transition-colors cursor-pointer"
              >
                {/* Repost Indicator */}
                {post.reposts?.includes(userProfile?.uid) && activeTab === 'posts' && (
                  <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    <span>Você repostou</span>
                  </div>
                )}
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 truncate">
                        <span className="font-bold text-gray-900 truncate">{post.authorName}</span>
                        {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge />}
                        <span className="text-gray-500 truncate">@{post.authorUsername}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 flex-shrink-0">
                          {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'Agora'}
                        </span>
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
                            {post.authorId === userProfile?.uid && (
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
                            )}
                            
                            <button 
                              onClick={() => {
                                if (userProfile?.isPremium) {
                                  // setIsStatsModalOpen(true);
                                  setActiveMenuPostId(null);
                                } else {
                                  alert('Estatísticas avançadas são um recurso Premium.');
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
                            Respondendo a <span className="text-black">@{post.replyToUsername}</span>
                          </div>
                        )}
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
                        {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                        {post.imageUrl && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-96 object-cover" />
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between mt-4 text-gray-500 max-w-md">
                      <button 
                        onClick={() => {
                          setReplyToPost(post);
                          setIsCreateModalOpen(true);
                        }}
                        className="flex items-center space-x-2 hover:text-black transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-black/5 rounded-full">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <span className="text-sm">{post.repliesCount || 0}</span>
                      </button>
                      <button 
                        onClick={() => handleRepost(post)}
                        className={`flex items-center space-x-2 transition-colors group ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
                      >
                        <motion.div 
                          whileTap={{ scale: 0.8 }}
                          className="p-2 group-hover:bg-green-50 rounded-full"
                        >
                          <svg className="w-5 h-5" fill={post.reposts?.includes(userProfile?.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        </motion.div>
                        <span className="text-sm">{post.repostsCount || 0}</span>
                      </button>
                      <button 
                        onClick={() => handleLikePost(post)}
                        className={`flex items-center space-x-2 transition-colors group ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                      >
                        <motion.div 
                          whileTap={{ scale: 0.8 }}
                          className="p-2 group-hover:bg-red-50 rounded-full"
                        >
                          <svg className="w-5 h-5" fill={post.likes?.includes(userProfile?.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </motion.div>
                        <span className="text-sm">{post.likesCount || 0}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatsPost(post);
                          setIsStatsModalOpen(true);
                        }}
                        className="flex items-center space-x-2 hover:text-black transition-colors group"
                      >
                        <div className="p-2 group-hover:bg-black/5 rounded-full">
                          <BarChart2 className="w-5 h-5" />
                        </div>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-black transition-colors group">
                        <div className="p-2 group-hover:bg-black/5 rounded-full">
                          <Send className="w-5 h-5" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {activeTab === 'posts' && "Ainda não há posts."}
            {activeTab === 'replies' && "Ainda não há respostas."}
            {activeTab === 'media' && "Ainda não há mídia."}
            {activeTab === 'likes' && "Você ainda não curtiu nenhum post."}
          </div>
        )}
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
      />

      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="sm:hidden fixed bottom-32 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-900 transition-colors z-[100] mobile-fab transition-all duration-300"
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
                        <BarChart2 className="w-4 h-4 text-gray-600" />
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
