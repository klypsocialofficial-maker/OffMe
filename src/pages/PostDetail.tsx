import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, ArrowLeft, MoreHorizontal, Trash2, Edit2, BarChart2, Heart, Repeat, MessageCircle, Send, Bookmark, BookmarkCheck, Ghost, Lock } from 'lucide-react';
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

import PostCard from '../components/PostCard';
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
  const [parentPost, setParentPost] = useState<any>(null);
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
  const [quotes, setQuotes] = useState<any[]>([]);
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
      where('privacy', '==', 'public'),
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

    const quotesQuery = query(
      collection(db, 'posts'),
      where('quotedPostId', '==', postId),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      const quotesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any);
      
      setQuotes(quotesData);
    });

    return () => {
      unsubscribePost();
      unsubscribeReplies();
      unsubscribeQuotes();
    };
  }, [postId, userProfile?.mutedUsers]);

  // Fetch parent post if this post is a reply
  useEffect(() => {
    if (!post?.replyToId || !db) {
      setParentPost(null);
      return;
    }

    const parentRef = doc(db, 'posts', post.replyToId);
    const unsubscribeParent = onSnapshot(parentRef, (docSnap) => {
      if (docSnap.exists()) {
        setParentPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setParentPost(null);
      }
    });

    return () => unsubscribeParent();
  }, [post?.replyToId]);

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
          setReplies(prev => prev.filter(r => r.id !== replyId));
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
            navigate('/', { replace: true });
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
        // Award points for liking and track mission
        await awardPoints(userProfile.uid, 5, 'like');
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
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-2 border-black/10 border-t-black rounded-full animate-spin" />
        </div>
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
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[max(env(safe-area-inset-top),44px)]">
        <div className="px-4 h-14 flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black tracking-tighter">THREAD</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Parent Post Context Chain */}
        {parentPost && (
          <div className="relative mb-[-12px]">
             {/* Threading line to main post */}
             <div className="absolute left-[33px] top-[48px] bottom-0 w-[2px] bg-gray-200 z-0"></div>
             <div className="relative z-10">
               <PostCard 
                  post={parentPost}
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
                  onReply={(p) => {
                    setReplyToPost(p);
                    setIsCreateModalOpen(true);
                  }}
                  onQuote={(p) => {
                    setQuotePost(p);
                    setIsCreateModalOpen(true);
                  }}
                  onImageClick={openImageViewer}
                  canEdit={canEditPost}
                />
             </div>
          </div>
        )}

        {/* Main Post - Hero Design */}
        <article className={`bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 relative z-10 ${parentPost ? 'mt-4' : ''}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div 
                className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md ${post.authorId === 'anonymous' ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : 'bg-gray-200'}`}
                onClick={() => {
                  if (post.authorId === 'anonymous') navigate('/anonymous-feed');
                  else navigate(`/${post.authorUsername}`);
                }}
              >
                {post.authorId === 'anonymous' ? (
                  <Ghost className="w-8 h-8 text-indigo-400" />
                ) : post.authorPhoto ? (
                  <LazyImage src={post.authorPhoto} alt={post.authorName} className="w-full h-full" />
                ) : (
                  <LazyImage src={getDefaultAvatar(post.authorName, post.authorUsername)} alt={post.authorName} className="w-full h-full" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1" onClick={() => {
                  if (post.authorId === 'anonymous') navigate('/anonymous-feed');
                  else navigate(`/${post.authorUsername}`);
                }}>
                  <div className={`font-black text-xl leading-tight truncate cursor-pointer ${post.authorId === 'anonymous' ? 'text-indigo-600 italic hover:underline' : 'hover:underline text-gray-900 tracking-tight'}`}>{post.authorName}</div>
                  {post.authorId !== 'anonymous' && post.authorPrivate && <Lock className="w-4 h-4 text-gray-400" />}
                  {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge tier={post.authorPremiumTier} />}
                </div>
                <div className="text-gray-500 font-medium">@{post.authorUsername}</div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                }}
                className="p-2.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 active:scale-90"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
              
              {activeMenuPostId === post.id && (
                <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                  {(post.authorId === userProfile?.uid || post.ownerId === userProfile?.uid) ? (
                    <>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 flex items-center space-x-3 font-bold text-sm"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                        <span>Apagar post</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (canEditPost(post)) {
                            setEditingPost(post);
                            setEditContent(post.content);
                            setActiveMenuPostId(null);
                          } else {
                            showToast('O tempo de edição expirou.', 'info');
                            setActiveMenuPostId(null);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center space-x-3 font-bold text-sm ${canEditPost(post) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                        <span>Editar post</span>
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm font-medium italic">Nenhuma ação disponível</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {post.replyToUsername && (
              <div className="bg-blue-50/50 px-3 py-1.5 rounded-lg text-blue-600 font-bold text-sm inline-flex items-center space-x-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Respondendo a @{post.replyToUsername}</span>
                {(post.replyToVerified || post.replyToUsername === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5" />}
              </div>
            )}
            
            {editingPost?.id === post.id ? (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={1000}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none resize-none min-h-[120px] text-lg"
                  autoFocus
                />
                <div className="flex justify-between items-center mt-3">
                  <div className={`text-xs font-black ${editContent.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {editContent.length} / 1000
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingPost(null)}
                      className="px-5 py-2 rounded-full font-black text-sm hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleEditPost(post.id)}
                      disabled={!editContent.trim() || editContent === post.content || editContent.length > 1000}
                      className="bg-black text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <PostContent content={post.content} className="text-2xl text-gray-900 leading-[1.4] font-medium tracking-tight break-words" />
                {post.quotedPostId && <QuotedPost post={post} />}
                {post.isEdited && <span className="text-gray-400 text-xs font-bold block">(editado)</span>}
              </div>
            )}
            
            {post.poll && (
              <Poll post={post} handleFirestoreError={handleFirestoreError} OperationType={OperationType} />
            )}
            
            <PostImageGrid imageUrls={post.imageUrls} onImageClick={openImageViewer} />

            {/* Timestamps and Meta */}
            <div className="py-4 border-y border-gray-50 flex flex-wrap gap-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
              <span>{post.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(post.createdAt.toDate()) : ''}</span>
              <span>·</span>
              <span>{post.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(post.createdAt.toDate()) : ''}</span>
              <span>·</span>
              <span className="text-black">{post.viewCount || 0} <span className="text-gray-400">Visualizações</span></span>
            </div>

            {/* Expanded Stats */}
            {(post.repliesCount > 0 || post.repostsCount > 0 || post.likesCount > 0) && (
              <div className="py-4 border-b border-gray-50 flex space-x-6 text-sm">
                {post.repliesCount > 0 && (
                  <div className="flex space-x-1 items-baseline">
                    <span className="font-black text-black">{post.repliesCount}</span>
                    <span className="text-gray-500 font-bold uppercase tracking-tighter text-[10px]">Respostas</span>
                  </div>
                )}
                {post.repostsCount > 0 && (
                  <div className="flex space-x-1 items-baseline">
                    <span className="font-black text-black">{post.repostsCount}</span>
                    <span className="text-gray-500 font-bold uppercase tracking-tighter text-[10px]">Reposts</span>
                  </div>
                )}
                {post.likesCount > 0 && (
                  <div className="flex space-x-1 items-baseline">
                    <span className="font-black text-black">{post.likesCount}</span>
                    <span className="text-gray-500 font-bold uppercase tracking-tighter text-[10px]">Curtidas</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar - Hero Style */}
            <div className="flex justify-around pt-2 text-gray-500">
              <button 
                onClick={() => {
                  setReplyToPost(post);
                  setIsCreateModalOpen(true);
                }}
                className="flex flex-col items-center space-y-1 group/action hover:text-blue-500 transition-colors p-2"
              >
                <div className="p-2.5 group-hover/action:bg-blue-50 rounded-2xl transition-colors">
                  <MessageCircle className="w-7 h-7" />
                </div>
              </button>
              <button 
                onPointerDown={handleRepostPointerDown(post)}
                onPointerUp={handleRepostPointerUp(post)}
                onPointerCancel={handleRepostPointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex flex-col items-center space-y-1 transition-colors p-2 ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
              >
                <div className={`p-2.5 rounded-2xl transition-colors ${post.reposts?.includes(userProfile?.uid) ? 'bg-green-50' : 'hover:bg-green-50'}`}>
                  <Repeat className={`w-7 h-7 ${post.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
                </div>
              </button>
              <motion.button 
                whileTap={{ scale: 1.3 }}
                animate={{ scale: post.likes?.includes(userProfile?.uid) ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={() => handleLikePost(post)}
                className={`flex flex-col items-center space-y-1 transition-colors p-2 ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <div className={`p-2.5 rounded-2xl transition-colors ${post.likes?.includes(userProfile?.uid) ? 'bg-red-50' : 'hover:bg-red-50'}`}>
                  <Heart className={`w-7 h-7 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                </div>
              </motion.button>
              <button 
                onClick={handleBookmark}
                className={`flex flex-col items-center space-y-1 transition-colors p-2 ${userProfile?.bookmarks?.includes(post.id) ? 'text-blue-500' : 'hover:text-blue-500'}`}
              >
                <div className={`p-2.5 rounded-2xl transition-colors ${userProfile?.bookmarks?.includes(post.id) ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                  {userProfile?.bookmarks?.includes(post.id) ? (
                    <BookmarkCheck className="w-7 h-7 fill-current" />
                  ) : (
                    <Bookmark className="w-7 h-7" />
                  )}
                </div>
              </button>
              <button 
                onClick={handleShare}
                className="flex flex-col items-center space-y-1 hover:text-blue-500 transition-colors p-2 group/action"
              >
                <div className="p-2.5 group-hover/action:bg-blue-50 rounded-2xl transition-colors">
                  <Send className="w-7 h-7" />
                </div>
              </button>
            </div>
          </div>
        </article>

        {/* Reply Shortcut Area */}
        <div 
          onClick={() => {
            setReplyToPost(post);
            setIsCreateModalOpen(true);
          }}
          className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:border-black/10 transition-all group active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-inner">
            {userProfile?.photoURL ? (
              <LazyImage src={userProfile.photoURL} alt="Your profile" className="w-full h-full" />
            ) : (
              <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt="Your profile" className="w-full h-full" />
            )}
          </div>
          <span className="text-gray-400 font-bold text-lg group-hover:text-gray-600 transition-colors">Postar sua resposta...</span>
        </div>

        {/* Conversation / Replies */}
        <div className="space-y-0 -mx-4 sm:-mx-0">
          {quotes.length > 0 && (
            <div className="mb-4">
               <h2 className="px-4 py-2 font-black text-gray-400 text-[11px] uppercase tracking-widest border-b border-gray-50">Citações</h2>
               <div className="divide-y divide-gray-50">
                 {quotes.map(quote => (
                   <PostCard 
                    key={quote.id}
                    post={quote}
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
                    onReply={(p) => {
                      setReplyToPost(p);
                      setIsCreateModalOpen(true);
                    }}
                    onQuote={(p) => {
                      setQuotePost(p);
                      setIsCreateModalOpen(true);
                    }}
                    onImageClick={openImageViewer}
                    canEdit={canEditPost}
                  />
                 ))}
               </div>
            </div>
          )}
          
          <h2 className="px-4 py-3 font-black text-gray-400 text-[11px] uppercase tracking-widest border-b border-gray-50">Respostas</h2>
          
          {replies.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-gray-400 font-medium italic">Nenhuma resposta ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white">
              {replies
                .filter(r => r.replyToId === postId) // Only direct replies to this post in this view
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate?.() || new Date(0);
                  const dateB = b.createdAt?.toDate?.() || new Date(0);
                  return dateB.getTime() - dateA.getTime();
                })
                .map(reply => (
                  <div key={reply.id} className="relative">
                    <PostCard 
                      post={reply}
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
                      onReply={(p) => {
                        setReplyToPost(p);
                        setIsCreateModalOpen(true);
                      }}
                      onQuote={(p) => {
                        setQuotePost(p);
                        setIsCreateModalOpen(true);
                      }}
                      onImageClick={openImageViewer}
                      canEdit={canEditPost}
                    />
                    {/* Show simple link if there are nested replies */}
                    {replies.some(r => r.replyToId === reply.id) && (
                      <div className="px-4 pb-4">
                        <button 
                          onClick={() => navigate(`/post/${reply.id}`)}
                          className="text-blue-500 hover:underline text-sm font-medium flex items-center space-x-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Mostrar esta conversa</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
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
                          <p className="text-xl font-bold">{livePost.viewCount || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Engajamento</p>
                          <p className="text-xl font-bold text-blue-600">
                            {livePost.viewCount > 0 
                              ? (((livePost.likesCount || 0) + (livePost.repostsCount || 0) + (livePost.repliesCount || 0)) / livePost.viewCount * 100).toFixed(1)
                              : '0.0'}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                              <UserIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium">Interações</span>
                          </div>
                          <span className="font-bold">{(livePost.likesCount || 0) + (livePost.repostsCount || 0) + (livePost.repliesCount || 0)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                              <BarChart2 className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium">Alcance</span>
                          </div>
                          <span className="font-bold">{livePost.viewCount || 0}</span>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-700 leading-relaxed">
                          As estatísticas são atualizadas em tempo real com base na atividade dos usuários.
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
