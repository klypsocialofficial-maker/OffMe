import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, ArrowLeft, MoreHorizontal, Trash2, Edit2, BarChart2, Heart, Repeat, MessageCircle, Send, Bookmark, BookmarkCheck, Ghost, Lock, Music, Play, Pause, ExternalLink, Pin, PinOff, VolumeX, UserX, Gift, ShieldAlert, Share } from 'lucide-react';
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
import ShareViaDMModal from '../components/ShareViaDMModal';
import ReportModal from '../components/ReportModal';
import TipModal from '../components/TipModal';
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
  const { userProfile, bookmarkPost, unbookmarkPost, pinPost, unpinPost, muteUser, unmuteUser, blockUser } = useAuth();
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
  const [isDMShareModalOpen, setIsDMShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
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
    }, (error) => {
      console.error("PostDetail unsubscribePost error: ", error);
      setLoading(false);
    });

    const repliesQuery = query(
      collection(db, 'posts'),
      where('threadId', '==', postId)
    );

    const unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      
      // Filter out replies from muted users and check privacy in memory
      const filteredReplies = repliesData.filter((reply: any) => {
        if (reply.privacy && reply.privacy !== 'public') {
          const isAuthor = userProfile?.uid && reply.authorId === userProfile.uid;
          const isAudience = userProfile?.uid && reply.audience?.includes(userProfile.uid);
          if (!isAuthor && !isAudience) return false;
        }
        return !userProfile?.mutedUsers?.includes(reply.authorId);
      });
      setReplies(filteredReplies);
    }, (error) => {
      console.error("PostDetail unsubscribeReplies error: ", error);
    });

    const quotesQuery = query(
      collection(db, 'posts'),
      where('quotedPostId', '==', postId)
    );

    const unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      const quotesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      
      const filteredQuotes = quotesData.filter((quote: any) => {
        if (quote.privacy && quote.privacy !== 'public') {
          const isAuthor = userProfile?.uid && quote.authorId === userProfile.uid;
          const isAudience = userProfile?.uid && quote.audience?.includes(userProfile.uid);
          if (!isAuthor && !isAudience) return false;
        }
        return !userProfile?.mutedUsers?.includes(quote.authorId);
      });
      setQuotes(filteredQuotes);
    }, (error) => {
      console.error("PostDetail unsubscribeQuotes error: ", error);
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
    }, (error) => {
      console.error("PostDetail unsubscribeParent error: ", error);
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

  // Reconstruct nested conversation/replies tree
  const replyTree = React.useMemo(() => {
    if (!postId || !replies.length) return [];
    
    // Create map of parentId -> replies
    const repliesMap: { [key: string]: any[] } = {};
    replies.forEach(r => {
      const parentId = r.replyToId || postId;
      if (!repliesMap[parentId]) repliesMap[parentId] = [];
      repliesMap[parentId].push(r);
    });

    const sortChronological = (a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.().getTime() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toDate?.().getTime() || b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    };

    const buildNode = (reply: any): any => {
      const children = repliesMap[reply.id] || [];
      return {
        ...reply,
        children: children.sort(sortChronological).map(buildNode)
      };
    };

    const directReplies = repliesMap[postId] || [];
    // Sort direct replies by descending (newest first)
    directReplies.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.().getTime() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toDate?.().getTime() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return directReplies.map(buildNode);
  }, [replies, postId]);

  const renderReplyNode = (node: any, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const maxIndentDepth = 3;
    const indentLevel = Math.min(depth, maxIndentDepth);
    
    return (
      <div key={node.id} className="relative mt-1">
        <div className="group">
          <PostCard 
            post={node}
            isThreadChild={depth > 0}
            isThreadParent={hasChildren}
            onLike={handleLikePost}
            onRepost={handleRepost}
            onDelete={handleDeletePost}
            onEdit={(p) => { setEditingPost(p); setEditContent(p.content); }}
            onShare={(p) => { setSelectedSharePost(p); setIsShareModalOpen(true); }}
            onReply={(p) => { setReplyToPost(p); setIsCreateModalOpen(true); }}
            onQuote={(p) => { setQuotePost(p); setIsCreateModalOpen(true); }}
            onImageClick={openImageViewer}
            canEdit={canEditPost}
          />
        </div>

        {hasChildren && (
          <div 
            className={`
              relative 
              border-l-[2px] border-dashed border-gray-100 hover:border-gray-200
              transition-colors duration-200
              ${indentLevel === 0 ? 'ml-7 md:ml-8 pl-4 md:pl-6' : ''}
              ${indentLevel === 1 ? 'ml-6 md:ml-7 pl-3 md:pl-5' : ''}
              ${indentLevel === 2 ? 'ml-5 md:ml-6 pl-2 md:pl-4' : ''}
              ${indentLevel >= 3 ? 'ml-3 pl-2' : ''}
              -mt-1.5 pb-2
            `}
          >
            <div className="space-y-1">
              {node.children.map((child: any) => renderReplyNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
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
    
    const tier = userProfile?.premiumTier;
    if (tier === 'gold' || tier === 'black') return true; // Unlimited
    
    const editLimitMinutes = tier === 'silver' ? 60 : 15; // 60 mins for silver, 15 mins for free
    
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= editLimitMinutes;
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

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        await awardPoints(userProfile.uid, 10, 'share');

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
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 pt-[max(env(safe-area-inset-top),44px)]">
        <div className="px-4 h-14 flex items-center space-x-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight">{post.authorName}</h1>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Publicação</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-0 sm:px-4">
        {/* Thread Chain Above Focus Post */}
        {parentPost && (
          <div className="relative">
             <PostCard 
                post={parentPost}
                isThreadParent={true}
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
        )}

        {/* Main Post (Focus) */}
        <article className="bg-white p-4 relative z-10">
          {post.replyToUsername && (
            <div className="flex items-center space-x-2 text-gray-500 text-[13px] font-bold mb-3 ml-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <div className="flex items-center space-x-1">
                <span>Respondendo a</span>
                <span 
                  className="text-blue-500 hover:underline cursor-pointer"
                  onClick={() => {
                    if (post.replyToId) navigate(`/post/${post.replyToId}`);
                  }}
                >
                  @{post.replyToUsername}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex flex-col items-center">
                {parentPost && (
                  <div className="w-[2px] bg-gray-200 absolute top-[-150px] bottom-12 left-1/2 -translate-x-1/2 z-0"></div>
                )}
                <div 
                  className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer shadow-sm relative z-10 ${post.authorId === 'anonymous' ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : 'bg-gray-200'}`}
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
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1" onClick={() => {
                  if (post.authorId === 'anonymous') navigate('/anonymous-feed');
                  else navigate(`/${post.authorUsername}`);
                }}>
                  <div className="font-bold text-[16px] truncate cursor-pointer hover:underline text-gray-900">{post.authorName}</div>
                  {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge tier={post.authorPremiumTier} />}
                  {post.authorPrivate && <Lock className="w-3 h-3 text-gray-400" />}
                </div>
                <div className="text-gray-500 text-[15px]">@{post.authorUsername}</div>
              </div>
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
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20" onClick={stopPropagation}>
                {(post.authorId === userProfile?.uid || post.ownerId === userProfile?.uid) ? (
                  <>
                    <button 
                      onClick={() => {
                        setActiveMenuPostId(null);
                        handleDeletePost(post.id);
                      }}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Apagar post</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (canEditPost(post)) {
                          setEditingPost(post);
                          setEditContent(post.content || '');
                        }
                        setActiveMenuPostId(null);
                      }}
                      className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEditPost(post) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar post</span>
                    </button>

                    <button 
                      onClick={async () => {
                        setActiveMenuPostId(null);
                        try {
                          if (userProfile?.pinnedPostIds?.includes(post.id)) {
                            await unpinPost(post.id);
                            showToast('Post desafixado do perfil', 'success');
                          } else {
                            await pinPost(post.id);
                            showToast('Post fixado no perfil', 'success');
                          }
                        } catch (error) {
                          showToast('Erro ao atualizar marcador', 'error');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {userProfile?.pinnedPostIds?.includes(post.id) ? (
                        <>
                          <PinOff className="w-4 h-4" />
                          <span>Desafixar do perfil</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4" />
                          <span>Fixar no perfil</span>
                        </>
                      )}
                    </button>
                  </>
                ) : post.authorId !== 'anonymous' ? (
                  <>
                    <button 
                      onClick={async () => {
                        setActiveMenuPostId(null);
                        try {
                          if (userProfile?.bookmarks?.includes(post.id)) {
                            await unbookmarkPost(post.id);
                            showToast('Removido dos salvos', 'success');
                          } else {
                            await bookmarkPost(post.id);
                            showToast('Salvo nos seus marcadores', 'success');
                          }
                        } catch (error) {
                          showToast('Erro ao salvar post', 'error');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {userProfile?.bookmarks?.includes(post.id) ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-blue-500" />
                          <span>Remover dos salvos</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Salvar post</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => {
                        setActiveMenuPostId(null);
                        navigate(`/${post.authorUsername}`);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Ver perfil @{post.authorUsername}</span>
                    </button>

                    {userProfile && userProfile.uid !== post.authorId && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPostId(null);
                          setIsTipModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-yellow-600 hover:bg-yellow-50 flex items-center space-x-2"
                      >
                        <Gift className="w-4 h-4" />
                        <span>Dar gorjeta</span>
                      </button>
                    )}

                    <button 
                      onClick={async () => {
                        setActiveMenuPostId(null);
                        try {
                          if (userProfile?.mutedUsers?.includes(post.authorId)) {
                            await unmuteUser(post.authorId);
                            showToast(`Desmutado @${post.authorUsername}`, 'success');
                          } else {
                            await muteUser(post.authorId);
                            showToast(`Mutado @${post.authorUsername}`, 'success');
                          }
                        } catch (error) {
                          showToast('Erro ao atualizar mudo', 'error');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <VolumeX className="w-4 h-4" />
                      <span>{userProfile?.mutedUsers?.includes(post.authorId) ? 'Desmutar' : 'Mutar'} @{post.authorUsername}</span>
                    </button>

                    <button 
                      onClick={async () => {
                        setActiveMenuPostId(null);
                        try {
                          await blockUser(post.authorId);
                          showToast(`Bloqueado @${post.authorUsername}`, 'success');
                          navigate('/', { replace: true });
                        } catch (error) {
                          showToast('Erro ao bloquear usuário', 'error');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Bloquear @{post.authorUsername}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setActiveMenuPostId(null);
                        setIsReportModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Denunciar post</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-400 italic border-b border-gray-100">Post anônimo</div>
                    <button 
                      onClick={async () => {
                        setActiveMenuPostId(null);
                        try {
                          if (userProfile?.bookmarks?.includes(post.id)) {
                            await unbookmarkPost(post.id);
                            showToast('Removido dos salvos', 'success');
                          } else {
                            await bookmarkPost(post.id);
                            showToast('Salvo nos seus marcadores', 'success');
                          }
                        } catch (error) {
                          showToast('Erro ao salvar post', 'error');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {userProfile?.bookmarks?.includes(post.id) ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-blue-500" />
                          <span>Remover dos salvos</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Salvar post</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <button 
                  onClick={(e) => {
                    stopPropagation(e);
                    setActiveMenuPostId(null);
                    setIsDMShareModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2 border-t border-gray-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar por DM</span>
                </button>
                
                <button 
                  onClick={(e) => {
                    setActiveMenuPostId(null);
                    handleShare(e);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Compartilhar link</span>
                </button>
              </div>
            )}
          </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {editingPost?.id === post.id ? (
              <div className="mt-2">
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
                    <button onClick={() => setEditingPost(null)} className="px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-all">Cancelar</button>
                    <button onClick={() => handleEditPost(post.id)} className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold">Salvar</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <PostContent content={post.content} className="text-[22px] leading-tight text-gray-900 font-normal break-words whitespace-pre-wrap" />
                {post.sharedMusic && (
                  <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center space-x-4 group/music relative">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md relative">
                      <img src={post.sharedMusic.artwork} alt={post.sharedMusic.title} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const audio = new Audio(post.sharedMusic.previewUrl);
                          audio.play();
                        }}
                        className="absolute inset-0 bg-black/20 group-hover/music:bg-black/40 flex items-center justify-center opacity-0 group-hover/music:opacity-100 transition-all"
                      >
                        <Play className="w-8 h-8 text-white fill-current" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Music className="w-4 h-4 text-blue-500" />
                        <span className="text-[11px] font-black italic text-blue-500 uppercase tracking-widest">Música Compartilhada</span>
                      </div>
                      <h4 className="font-bold text-lg text-gray-900 truncate">{post.sharedMusic.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{post.sharedMusic.artist}</p>
                    </div>
                    <a 
                      href={post.sharedMusic.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors shadow-sm"
                      title="Ouvir no Spotify"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                )}
                {post.quotedPostId && <QuotedPost post={post} />}
                {post.imageUrls && <PostImageGrid imageUrls={post.imageUrls} onImageClick={openImageViewer} />}
                {post.poll && <Poll post={post} handleFirestoreError={handleFirestoreError} OperationType={OperationType} />}
              </div>
            )}

            {/* Time & Stats */}
            <div className="py-4 border-b border-gray-100 text-[15px] text-gray-500 flex space-x-1 items-center">
              <span>{post.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(post.createdAt.toDate()) : ''}</span>
              <span>·</span>
              <span>{post.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(post.createdAt.toDate()) : ''}</span>
              {post.viewCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-gray-900 font-bold">{post.viewCount}</span>
                  <span className="text-gray-500">Visualizações</span>
                </>
              )}
            </div>

            {/* Counters */}
            {(post.repostsCount > 0 || post.likesCount > 0 || post.repliesCount > 0) && (
              <div className="py-4 border-b border-gray-100 flex space-x-5 text-[15px]">
                {post.repostsCount > 0 && (
                  <div className="flex space-x-1 cursor-pointer hover:underline" onClick={() => {/* handle stats modal */}}>
                    <span className="font-bold text-gray-900">{post.repostsCount}</span>
                    <span className="text-gray-500">Reposts</span>
                  </div>
                )}
                {post.repliesCount > 0 && (
                  <div className="flex space-x-1">
                    <span className="font-bold text-gray-900">{post.repliesCount}</span>
                    <span className="text-gray-500">Respostas</span>
                  </div>
                )}
                {post.likesCount > 0 && (
                  <div className="flex space-x-1 cursor-pointer hover:underline">
                    <span className="font-bold text-gray-900">{post.likesCount}</span>
                    <span className="text-gray-500">Curtidas</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex justify-around py-1 border-b border-gray-100">
              <button 
                onClick={() => { setReplyToPost(post); setIsCreateModalOpen(true); }}
                className="p-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
              >
                <MessageCircle className="w-5.5 h-5.5" />
              </button>
              <button 
                onClick={() => handleRepost(post)}
                className={`p-3 transition-all rounded-full ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'text-gray-500 hover:text-green-500 hover:bg-green-50'}`}
              >
                <Repeat className={`w-5.5 h-5.5 ${post.reposts?.includes(userProfile?.uid) ? 'stroke-[2.5px]' : ''}`} />
              </button>
              <button 
                onClick={() => handleLikePost(post)}
                className={`p-3 transition-all rounded-full ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}
              >
                <Heart className={`w-5.5 h-5.5 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleBookmark}
                className={`p-3 transition-all rounded-full ${userProfile?.bookmarks?.includes(post.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'}`}
              >
                <Bookmark className={`w-5.5 h-5.5 ${userProfile?.bookmarks?.includes(post.id) ? 'fill-current' : ''}`} />
              </button>
              <button onClick={handleShare} className="p-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all">
                {navigator.share ? <Share className="w-5.5 h-5.5" /> : <Send className="w-5.5 h-5.5" />}
              </button>
            </div>
          </div>
        </article>

        {/* Quick Reply Bar */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center space-x-3 cursor-pointer" onClick={() => { setReplyToPost(post); setIsCreateModalOpen(true); }}>
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? <LazyImage src={userProfile.photoURL} alt="User" className="w-full h-full" /> : <div className="w-full h-full bg-gray-200" />}
          </div>
          <div className="text-gray-500 text-[17px]">Postar sua resposta...</div>
        </div>

        {/* Replies List (Nested Thread View) */}
        <div className="divide-y divide-gray-100 pb-20">
          {replyTree.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-500 font-bold">Nenhuma resposta encontrada.</p>
              <p className="text-gray-400 text-sm">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            replyTree.map(replyNode => (
              <div key={replyNode.id} className="border-b border-gray-50/50 last:border-0">
                {renderReplyNode(replyNode, 0)}
              </div>
            ))
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

      <ShareViaDMModal
        isOpen={isDMShareModalOpen}
        onClose={() => setIsDMShareModalOpen(false)}
        post={post}
      />

      {post && (
        <ReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={post.id}
          targetType="post"
          targetName={post.authorName}
        />
      )}

      {post && (
        <TipModal
          isOpen={isTipModalOpen}
          onClose={() => setIsTipModalOpen(false)}
          senderId={userProfile?.uid}
          senderPoints={userProfile?.points || 0}
          receiverId={post.authorId}
          receiverName={post.authorName}
          onSuccess={() => {
              showToast('Gorjeta enviada com sucesso!', 'success');
              setIsTipModalOpen(false);
          }}
          onError={(err: string) => {
              showToast(err || 'Erro ao enviar gorjeta.', 'error');
          }}
        />
      )}
    </div>
  );
}
