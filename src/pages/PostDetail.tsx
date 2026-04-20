import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, ArrowLeft, MoreHorizontal, Trash2, Edit2, BarChart2, Heart, Repeat, MessageCircle, Send, Bookmark, BookmarkCheck, Ghost } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import PostContent from '../components/PostContent';
import QuotedPost from '../components/QuotedPost';
import Poll from '../components/Poll';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../lib/dateUtils';
import { sendPushNotification } from '../lib/notifications';
import { awardPoints } from '../services/gamificationService';
import { getDefaultAvatar } from '../lib/avatar';
import CreatePostModal from '../components/CreatePostModal';
import SharePostModal from '../components/SharePostModal';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { auth } from '../firebase';

import PostImageGrid from '../components/PostImageGrid';
import ImageViewer from '../components/ImageViewer';
import LazyImage from '../components/LazyImage';

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

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { userProfile, bookmarkPost, unbookmarkPost } = useAuth();
  const [post, setPost] = useState<any>(null);
  const repostTimerRef = React.useRef<any>(null);

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

  const handleRepostPointerDown = (postToRepost: any) => (e: React.PointerEvent) => {
    stopPropagation(e);
    repostTimerRef.current = setTimeout(() => {
      setQuotePost(postToRepost);
      setIsCreateModalOpen(true);
      repostTimerRef.current = 'QUOTED';
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handleRepostPointerUp = (postToRepost: any) => (e: React.PointerEvent) => {
    stopPropagation(e);
    if (repostTimerRef.current === 'QUOTED') {
      repostTimerRef.current = null;
      return;
    }
    
    if (repostTimerRef.current) {
      clearTimeout(repostTimerRef.current);
      repostTimerRef.current = null;
      handleRepost(postToRepost);
    }
  };

  const handleRepostPointerCancel = () => {
    if (repostTimerRef.current && repostTimerRef.current !== 'QUOTED') {
      clearTimeout(repostTimerRef.current);
    }
    repostTimerRef.current = null;
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    stopPropagation(e);
    if (!userProfile?.uid || !post) return;
    
    try {
      if (userProfile.bookmarks?.includes(post.id)) {
        await unbookmarkPost(post.id);
      } else {
        await bookmarkPost(post.id);
      }
    } catch (error) {
      console.error('Erro ao favoritar post:', error);
    }
  };
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<any>(null);
  const [quotePost, setQuotePost] = useState<any | null>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeMenuReplyId, setActiveMenuReplyId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedStatsPostId, setSelectedStatsPostId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSharePost, setSelectedSharePost] = useState<any | null>(null);
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

  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuPostId(null);
      setActiveMenuReplyId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!postId || !db) return;

    setLoading(true);
    const postRef = doc(db, 'posts', postId);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    const repliesQuery = query(
      collection(db, 'posts'),
      where('threadId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any);
      
      // Filter out replies from muted users
      const filteredReplies = repliesData.filter((reply: any) => !userProfile?.mutedUsers?.includes(reply.authorId));
      setReplies(filteredReplies);
    });

    return () => {
      unsubscribePost();
      unsubscribeReplies();
    };
  }, [postId, userProfile?.mutedUsers]);

  const handleDeleteReply = async (replyId: string) => {
    if (!db || !userProfile) return;
    setActiveMenuReplyId(null);
    setConfirmModal({
      isOpen: true,
      title: 'Excluir resposta',
      message: 'Tem certeza que deseja excluir esta resposta? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', replyId));
          showToast('Resposta excluída com sucesso', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${replyId}`);
        }
      }
    });
  };

  const handleDeletePost = async (id: string) => {
    if (!db || !userProfile) return;
    setActiveMenuPostId(null);
    setConfirmModal({
      isOpen: true,
      title: 'Apagar post',
      message: 'Tem certeza que deseja apagar este post? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', id));
          if (id === postId) {
            navigate(-1);
          }
          showToast('Post apagado com sucesso', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
        }
      }
    });
  };

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid && post.ownerId !== userProfile?.uid) return false;
    if ((userProfile as any)?.isPremium) return true;
    
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= 3;
  };

  const handleEditPost = async (id: string) => {
    if (!db || !userProfile?.uid || !editContent.trim() || editContent.length > 1000) return;
    
    try {
      await updateDoc(doc(db, 'posts', id), {
        content: editContent.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
      setActiveMenuPostId(null);
      setActiveMenuReplyId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handleLikePost = async (postToLike: any) => {
    if (!userProfile?.uid || !db) return;
    
    // Redirect interaction to the original post if it's a repost
    const targetPost = postToLike.type === 'repost' ? { id: postToLike.repostedPostId, ...postToLike } : postToLike;
    const isLiked = targetPost.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', targetPost.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (targetPost.likesCount || 0) - 1) : (targetPost.likesCount || 0) + 1
      });
      
      if (!isLiked) {
        // Award points for liking
        await awardPoints(userProfile.uid, 5);
      }
      
      if (!isLiked && postToLike.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: postToLike.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'like',
          postId: postToLike.id,
          read: false,
          createdAt: serverTimestamp()
        });

        // Trigger push notification
        await sendPushNotification(
          postToLike.authorId,
          'Novo Like',
          `${userProfile.displayName} curtiu seu post.`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    
    if (navigator.share) {
      const shareData = {
        title: `Post de ${post.authorName} no Offme`,
        text: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        url: window.location.href
      };

      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Erro ao compartilhar nativamente:', error);
      }
    }
    
    setSelectedSharePost(post);
    setIsShareModalOpen(true);
  };

  const handleRepost = async (postToRepost: any) => {
    if (!userProfile?.uid || !db) return;
    
    // We can't repost a repost directly in this simple implementation, 
    // we repost the original post.
    const targetPost = postToRepost.type === 'repost' ? { id: postToRepost.repostedPostId, ...postToRepost } : postToRepost;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>
        <div className="bg-white p-8 rounded-2xl text-center shadow-sm">
          <p className="text-gray-500">Este post não foi encontrado ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Post</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Main Post */}
        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex space-x-4">
            <div 
              className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${post.authorId === 'anonymous' ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : 'bg-gray-200'}`}
              onClick={() => {
                if (post.authorId === 'anonymous') navigate('/anonymous-feed');
                else navigate(`/${post.authorUsername}`);
              }}
            >
              {post.authorId === 'anonymous' ? (
                <Ghost className="w-6 h-6 text-indigo-400" />
              ) : post.authorPhoto ? (
                <LazyImage src={post.authorPhoto} alt={post.authorName} className="w-full h-full" />
              ) : (
                <LazyImage src={getDefaultAvatar(post.authorName, post.authorUsername)} alt={post.authorName} className="w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1" onClick={() => {
                    if (post.authorId === 'anonymous') navigate('/anonymous-feed');
                    else navigate(`/${post.authorUsername}`);
                  }}>
                    <div className={`font-bold text-lg leading-tight truncate max-w-[150px] sm:max-w-[250px] cursor-pointer ${post.authorId === 'anonymous' ? 'text-indigo-600 italic hover:underline' : 'hover:underline'}`}>{post.authorName}</div>
                    {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge tier={post.authorPremiumTier} />}
                    <span className="text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 text-sm">
                      {post.createdAt?.toDate ? formatRelativeTime(post.createdAt.toDate()) : 'Agora'}
                    </span>
                  </div>
                  <div className="text-gray-500 truncate">@{post.authorUsername}</div>
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {activeMenuPostId === post.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                      {(post.authorId === userProfile?.uid || post.ownerId === userProfile?.uid) ? (
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
                        <div className="px-4 py-2 text-gray-500 text-sm">Nenhuma ação disponível</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {post.replyToUsername && (
              <div className="mb-2 text-gray-500 flex items-center space-x-1">
                <span>Respondendo a</span>
                <span className="text-blue-500">@{post.replyToUsername}</span>
                {(post.replyToVerified || post.replyToUsername === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 text-blue-500" />}
              </div>
            )}
            
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
                <PostContent content={post.content} className="text-xl text-gray-900 leading-relaxed" />
                {post.quotedPostId && <QuotedPost post={post} />}
                {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
              </>
            )}
            
            {post.poll && (
              <Poll post={post} handleFirestoreError={handleFirestoreError} OperationType={OperationType} />
            )}
            
            <PostImageGrid imageUrls={post.imageUrls} onImageClick={openImageViewer} />

            <div className="flex justify-around mt-4 py-3 border-t border-gray-50 text-gray-500">
              <button 
                onClick={() => {
                  setReplyToPost(post);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center space-x-2 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-medium">{post.repliesCount || 0}</span>
              </button>
              <button 
                onPointerDown={handleRepostPointerDown(post)}
                onPointerUp={handleRepostPointerUp(post)}
                onPointerCancel={handleRepostPointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex items-center space-x-2 transition-colors p-2 rounded-full ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500 bg-green-50' : 'hover:text-green-500 hover:bg-green-50'}`}
              >
                <Repeat className={`w-6 h-6 ${post.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
                <span className="text-sm font-medium">{post.repostsCount || 0}</span>
              </button>
              <motion.button 
                whileTap={{ scale: 1.3 }}
                animate={{ scale: post.likes?.includes(userProfile?.uid) ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => handleLikePost(post)}
                className={`flex items-center space-x-2 transition-colors p-2 rounded-full ${post.likes?.includes(userProfile?.uid) ? 'text-red-500 bg-red-50' : 'hover:text-red-500 hover:bg-red-50'}`}
              >
                <Heart className={`w-6 h-6 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{post.likesCount || 0}</span>
              </motion.button>
              {post.authorId === userProfile?.uid && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatsPostId(post.id);
                    setIsStatsModalOpen(true);
                  }}
                  className="flex items-center space-x-2 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"
                >
                  <BarChart2 className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={handleBookmark}
                className={`flex items-center space-x-2 transition-colors p-2 rounded-full ${userProfile?.bookmarks?.includes(post.id) ? 'text-blue-500 bg-blue-50' : 'hover:text-blue-500 hover:bg-blue-50'}`}
              >
                {userProfile?.bookmarks?.includes(post.id) ? (
                  <BookmarkCheck className="w-6 h-6 fill-current" />
                ) : (
                  <Bookmark className="w-6 h-6" />
                )}
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center space-x-2 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </article>

        {/* Reply Input Area */}
        <div 
          onClick={() => {
            setReplyToPost(post);
            setIsCreateModalOpen(true);
          }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <LazyImage src={userProfile.photoURL} alt="Your profile" className="w-full h-full" />
            ) : (
              <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt="Your profile" className="w-full h-full" />
            )}
          </div>
          <span className="text-gray-500 text-lg">Postar sua resposta</span>
        </div>

        {/* Conversation / Replies */}
        <div className="space-y-3">
          <h2 className="px-2 font-bold text-gray-700">Respostas</h2>
          {replies.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-100">
              <p className="text-gray-500">Nenhuma resposta ainda. Seja o primeiro a responder!</p>
            </div>
          ) : (
            (() => {
              const buildTree = (replies: any[], parentId: string | null): any[] => {
                return replies
                  .filter(reply => reply.replyToId === parentId)
                  .map(reply => ({
                    ...reply,
                    children: buildTree(replies, reply.id)
                  }));
              };

              const ReplyComponent: React.FC<{ reply: any, depth?: number }> = ({ reply, depth = 0 }) => (
                <div style={{ marginLeft: depth * 20 }}>
                  <article 
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex space-x-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/post/${reply.id}`);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {reply.authorPhoto ? (
                        <LazyImage src={reply.authorPhoto} alt={reply.authorName} className="w-full h-full" />
                      ) : (
                        <LazyImage src={getDefaultAvatar(reply.authorName, reply.authorUsername)} alt={reply.authorName} className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 flex-1 min-w-0">
                          <span className="font-bold truncate max-w-[100px] sm:max-w-[150px]">{reply.authorName}</span>
                          {(reply.authorVerified || reply.authorUsername === 'Rulio') && <VerifiedBadge tier={reply.authorPremiumTier} />}
                          <span className="text-gray-500 truncate text-sm flex-shrink min-w-0">@{reply.authorUsername}</span>
                          <span className="text-gray-500 flex-shrink-0">·</span>
                          <span className="text-gray-500 flex-shrink-0 text-sm">
                            {reply.createdAt?.toDate ? formatRelativeTime(reply.createdAt.toDate()) : 'Agora'}
                          </span>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuReplyId(activeMenuReplyId === reply.id ? null : reply.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {activeMenuReplyId === reply.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                              {(reply.authorId === userProfile?.uid || reply.ownerId === userProfile?.uid) ? (
                                <>
                                  <button 
                                    onClick={() => handleDeleteReply(reply.id)}
                                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Apagar resposta</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (canEditPost(reply)) {
                                        setEditingPost(reply);
                                        setEditContent(reply.content);
                                        setActiveMenuReplyId(null);
                                      } else {
                                        showToast('O tempo de edição (3 minutos) expirou. Assine o Premium para editar a qualquer momento.', 'info');
                                        setActiveMenuReplyId(null);
                                      }
                                    }}
                                    className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEditPost(reply) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Editar resposta</span>
                                  </button>
                                </>
                              ) : (
                                <div className="px-4 py-2 text-gray-500 text-sm">Nenhuma ação disponível</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingPost?.id === reply.id ? (
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
                                onClick={() => handleEditPost(reply.id)}
                                disabled={!editContent.trim() || editContent === reply.content || editContent.length > 1000}
                                className="bg-black text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <PostContent content={reply.content} className="mt-1 text-gray-900" />
                          {reply.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                        </>
                      )}
                      
                      {reply.poll && (
                        <Poll post={reply} handleFirestoreError={handleFirestoreError} OperationType={OperationType} />
                      )}
                      
                      <PostImageGrid imageUrls={reply.imageUrls} onImageClick={openImageViewer} />

                      <div className="flex justify-between mt-3 text-gray-500 max-w-[200px]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyToPost(reply);
                            setIsCreateModalOpen(true);
                          }}
                          className="flex items-center space-x-1 hover:text-blue-500"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{reply.repliesCount || 0}</span>
                        </button>
                        <button 
                          onPointerDown={handleRepostPointerDown(reply)}
                          onPointerUp={handleRepostPointerUp(reply)}
                          onPointerCancel={handleRepostPointerCancel}
                          onContextMenu={(e) => e.preventDefault()}
                          className={`flex items-center space-x-1 transition-colors ${reply.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
                        >
                          <Repeat className={`w-4 h-4 ${reply.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
                          <span className="text-xs">{reply.repostsCount || 0}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(reply);
                          }}
                          className={`flex items-center space-x-1 transition-colors ${reply.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                        >
                          <Heart className={`w-4 h-4 ${reply.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                          <span className="text-xs">{reply.likesCount || 0}</span>
                        </button>
                        {reply.authorId === userProfile?.uid && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatsPostId(reply.id);
                              setIsStatsModalOpen(true);
                            }}
                            className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                  {reply.children.map((child: any) => (
                    <ReplyComponent key={child.id} reply={child} depth={depth + 1} />
                  ))}
                </div>
              );

              const replyTree = buildTree(replies, postId || null);
              return replyTree.map(reply => <ReplyComponent key={reply.id} reply={reply} />);
            })()
          )}
        </div>
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setReplyToPost(null);
          setQuotePost(null);
        }}
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
        replyTo={replyToPost}
        quotePost={quotePost}
      />

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

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      {/* Stats Modal (Real-time) */}
      <AnimatePresence>
        {isStatsModalOpen && selectedStatsPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              {(() => {
                // Check if it's the main post or a reply
                const livePost = post?.id === selectedStatsPostId ? post : replies.find(r => r.id === selectedStatsPostId);
                if (!livePost) return <p className="text-center text-gray-500">Post não encontrado...</p>;

                return (
                  <>
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
                          <p className="text-xl font-bold">{(livePost.likesCount || 0) * 12 + (livePost.repostsCount || 0) * 25 + 142}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Engajamento</p>
                          <p className="text-xl font-bold text-blue-600">
                            {(((livePost.likesCount || 0) + (livePost.repostsCount || 0) + (livePost.repliesCount || 0)) / 10 + 2.4).toFixed(1)}%
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
                          <span className="font-bold">{(livePost.likesCount || 0) * 2 + 3}</span>
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
                  </>
                );
              })()}

              <button 
                onClick={() => {
                  setIsStatsModalOpen(false);
                  setSelectedStatsPostId(null);
                }}
                className="mt-8 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ImageViewer 
        src={viewerImage?.src || null}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        alt={viewerImage?.alt}
      />
    </div>
  );
}
