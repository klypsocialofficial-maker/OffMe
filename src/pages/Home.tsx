import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Send, MoreHorizontal, Trash2, Edit2, BarChart2, Plus, Heart, Repeat, MessageCircle, ArrowUp, Search, X, Image as ImageIcon, Zap as ZapIcon, Ghost, Hash } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc, updateDoc, limit, arrayUnion, arrayRemove, startAfter, getDocs, QueryDocumentSnapshot, deleteField } from 'firebase/firestore';
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
import { deletePostAndRelationships } from '../lib/postUtils';

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
  const { userProfile, logout, followHashtag, unfollowHashtag } = useAuth();
  const navigate = useNavigate();
  const { openDrawer, openCreateModal } = useOutletContext<{ 
    openDrawer: () => void; 
    openCreateModal: (replyTo?: any, quotePost?: any, isAnonymous?: boolean) => void 
  }>();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'hashtags'>('foryou');
  const [displayedPosts, setDisplayedPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isInitialLoadRef = useRef(true);
  const displayedPostsRef = useRef<any[]>([]);

  useEffect(() => {
    displayedPostsRef.current = displayedPosts;
  }, [displayedPosts]);

  const lastActiveTabRef = useRef(activeTab);

  const followingString = useMemo(() => {
    return (userProfile?.following || []).join(',');
  }, [userProfile?.following]);

  const mutedString = useMemo(() => {
    return (userProfile?.mutedUsers || []).join(',');
  }, [userProfile?.mutedUsers]);

  const followedHashtagsString = useMemo(() => {
    return (userProfile?.followedHashtags || []).join(',');
  }, [userProfile?.followedHashtags]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    setDisplayedPosts([]);
  }, [activeTab]);

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const lastFetchTimeRef = useRef<{foryou: number; following: number}>({ foryou: 0, following: 0 });
  const lastRefreshKeyRef = useRef(refreshKey);

  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Artificial delay for the ghost animation effect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    isInitialLoadRef.current = true;
    setRefreshKey(prev => prev + 1);
    setIsFetching(true);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    const handleScrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRefresh = () => {
      refreshFeed();
    };

    window.addEventListener('applet:scroll-to-top', handleScrollToTop);
    window.addEventListener('applet:refresh-feed', handleRefresh);

    return () => {
      window.removeEventListener('applet:scroll-to-top', handleScrollToTop);
      window.removeEventListener('applet:refresh-feed', handleRefresh);
    };
  }, [refreshFeed]);

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

  const [newPostsCount, setNewPostsCount] = useState(0);
  const POSTS_PER_PAGE = 15;

  const fetchPosts = async (isInitial = true) => {
    if (!db || isInitial) return;
    
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      let q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE * 4)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(lastDoc);
        
        const allPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));

        // Filter client-side to avoid composite index requirements
        const filteredPosts = allPosts.filter(post => {
          // 1. Muted user filter
          if (userProfile?.mutedUsers?.includes(post.authorId)) return false;

          // 2. Privacy filter
          if (post.privacy && post.privacy !== 'public') {
            const isAuthor = userProfile?.uid && post.authorId === userProfile.uid;
            const isAudience = userProfile?.uid && post.audience?.includes(userProfile.uid);
            if (!isAuthor && !isAudience) return false;
          }

          // 3. Following filter (for "Following" tab)
          if (activeTab === 'following') {
            const followingIds = userProfile?.following ? [...userProfile.following] : [];
            if (userProfile?.uid && !followingIds.includes(userProfile.uid)) {
              followingIds.push(userProfile.uid);
            }
            if (!followingIds.includes(post.authorId)) return false;
          }

          // 4. Hashtags filter (for "Hashtags" tab)
          if (activeTab === 'hashtags') {
            const followed = userProfile?.followedHashtags || [];
            if (followed.length === 0) return false;
            const postTags = post.hashtags || [];
            const hasMatch = postTags.some((tag: string) => followed.includes(tag.toLowerCase()));
            if (!hasMatch) return false;
          }

          return true;
        });

        setDisplayedPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filteredNew = filteredPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...filteredNew];
        });
        
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE * 4);
      }
    } catch (error) {
      console.error("Feed error:", error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!db) return;

    setIsFetching(true);
    setLastVisible(null);
    setHasMore(true);
    setNewPostsCount(0);

    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(POSTS_PER_PAGE * 4)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsFetching(false);
      if (snapshot.empty) {
        setDisplayedPosts([]);
        setHasMore(false);
      } else {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(lastDoc);
        
        const allPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));

        // Filter client-side to avoid composite index requirements
        const filteredPosts = allPosts.filter(post => {
          // 1. Muted user filter
          if (userProfile?.mutedUsers?.includes(post.authorId)) return false;

          // 2. Privacy filter
          if (post.privacy && post.privacy !== 'public') {
            const isAuthor = userProfile?.uid && post.authorId === userProfile.uid;
            const isAudience = userProfile?.uid && post.audience?.includes(userProfile.uid);
            if (!isAuthor && !isAudience) return false;
          }

          // 3. Following filter (for "Following" tab)
          if (activeTab === 'following') {
            const followingIds = userProfile?.following ? [...userProfile.following] : [];
            if (userProfile?.uid && !followingIds.includes(userProfile.uid)) {
              followingIds.push(userProfile.uid);
            }
            if (!followingIds.includes(post.authorId)) return false;
          }

          // 4. Hashtags filter (for "Hashtags" tab)
          if (activeTab === 'hashtags') {
            const followed = userProfile?.followedHashtags || [];
            if (followed.length === 0) return false;
            const postTags = post.hashtags || [];
            const hasMatch = postTags.some((tag: string) => followed.includes(tag.toLowerCase()));
            if (!hasMatch) return false;
          }

          return true;
        });

        setDisplayedPosts(filteredPosts);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE * 4);
      }
    }, (error) => {
      console.error("Feed snapshot error:", error);
      setDisplayedPosts([]);
      setHasMore(false);
      setIsFetching(false);
    });

    return () => {
      unsubscribe();
    };
  }, [activeTab, db, followingString, mutedString, followedHashtagsString, refreshKey, userProfile?.uid]);

  // Listener for new posts to show update notification
  useEffect(() => {
    if (!db || !userProfile || isFetching || displayedPosts.length === 0) return;

    // Get the timestamp of the most recent post we have
    const latestTimestamp = displayedPosts[0]?.createdAt;
    if (!latestTimestamp) return;

    const q = query(
      collection(db, 'posts'),
      where('createdAt', '>', latestTimestamp),
      limit(40)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter in memory to avoid composite index requirements
      const news = snapshot.docs.filter(doc => {
        const postData = doc.data();
        if (postData.authorId === userProfile.uid) return false;

        // Privacy check
        if (postData.privacy && postData.privacy !== 'public') {
          const isAuthor = userProfile?.uid && postData.authorId === userProfile.uid;
          const isAudience = userProfile?.uid && postData.audience?.includes(userProfile.uid);
          if (!isAuthor && !isAudience) return false;
        }

        // Following check
        if (activeTab === 'following') {
          const followingIds = userProfile?.following ? [...userProfile.following] : [];
          if (userProfile?.uid && !followingIds.includes(userProfile.uid)) {
            followingIds.push(userProfile.uid);
          }
          if (!followingIds.includes(postData.authorId)) return false;
        }

        // Hashtags check
        if (activeTab === 'hashtags') {
          const followed = userProfile?.followedHashtags || [];
          if (followed.length === 0) return false;
          const postTags = postData.hashtags || [];
          const hasMatch = postTags.some((tag: string) => followed.includes(tag.toLowerCase()));
          if (!hasMatch) return false;
        }

        return true;
      });

      setNewPostsCount(news.length);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    });

    return () => unsubscribe();
  }, [activeTab, db, userProfile?.uid, isFetching, displayedPosts[0]?.id, followedHashtagsString]);

  const loadMorePosts = useCallback(() => {
    fetchPosts(false);
  }, [isLoadingMore, hasMore, db, isFetching, lastVisible, activeTab]);

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
    // We can remove the old complex prepending logic since onSnapshot handles it perfectly
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile) return;
    try {
      await deletePostAndRelationships(postId);
      // Displayed posts will automatically update from onSnapshot
      setActiveMenuPostId(null);
      showToast('Post apagado com sucesso', 'success');
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
      await awardPoints(userProfile.uid, 5, 'follow');
      
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

  const handleLikePost = async (post: any, reactionId: string = 'heart') => {
    if (!userProfile?.uid || !db) return;
    
    // Redirect interaction to the original post if it's a repost
    const targetPost = post.type === 'repost' ? { id: post.repostedPostId, ...post } : post;
    const existingReaction = targetPost.reactions?.[userProfile.uid];
    const isLiked = !!existingReaction;
    const postRef = doc(db, 'posts', targetPost.id);
    
    // Optimistic UI Update - Update all instances of the post (original or repost)
    const newDisplayedPosts = displayedPosts.map(p => {
      const isMatch = p.id === targetPost.id || (p.type === 'repost' && p.repostedPostId === targetPost.id);
      if (isMatch) {
        const reactions = { ...(p.reactions || {}) };
        let likesCount = p.likesCount || 0;
        let likes = [...(p.likes || [])];
        
        if (isLiked && existingReaction === reactionId) {
          delete reactions[userProfile.uid];
          likesCount = Math.max(0, likesCount - 1);
          likes = likes.filter(uid => uid !== userProfile.uid);
        } else {
          if (!isLiked) {
            likesCount += 1;
            likes.push(userProfile.uid);
          }
          reactions[userProfile.uid] = reactionId;
        }
        
        return { ...p, reactions, likesCount, likes };
      }
      return p;
    });
    setDisplayedPosts(newDisplayedPosts);

    try {
      if (isLiked && existingReaction === reactionId) {
        // Toggle off if clicking the same reaction
        await updateDoc(postRef, {
          [`reactions.${userProfile.uid}`]: deleteField(),
          likesCount: Math.max(0, (targetPost.likesCount || 0) - 1),
          likes: arrayRemove(userProfile.uid)
        });
      } else {
        // Add or change reaction
        await updateDoc(postRef, {
          [`reactions.${userProfile.uid}`]: reactionId,
          likesCount: isLiked ? (targetPost.likesCount || 0) : (targetPost.likesCount || 0) + 1,
          likes: arrayUnion(userProfile.uid)
        });
        
        if (!isLiked) {
          await awardPoints(userProfile.uid, 5, 'like');
        }
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
    
    // Optimistic UI Update - Update all instances
    const newDisplayedPosts = displayedPosts.map(p => {
      const isMatch = p.id === targetPost.id || (p.type === 'repost' && p.repostedPostId === targetPost.id);
      if (isMatch) {
        let repostsCount = p.repostsCount || 0;
        let reposts = [...(p.reposts || [])];
        
        if (isReposted) {
          repostsCount = Math.max(0, repostsCount - 1);
          reposts = reposts.filter(uid => uid !== userProfile.uid);
        } else {
          repostsCount += 1;
          reposts.push(userProfile.uid);
        }
        
        return { ...p, repostsCount, reposts };
      }
      return p;
    });
    setDisplayedPosts(newDisplayedPosts);

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
          const repostDocId = snapshot.docs[0].id;
          await deleteDoc(doc(db, 'posts', repostDocId));
          setDisplayedPosts(prev => prev.filter(p => p.id !== repostDocId));
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

  const BASE_EDIT_TIME_MINUTES = 15;
  const PREMIUM_EDIT_TIME_MINUTES = 60;

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid && post.ownerId !== userProfile?.uid) return false;

    const tier = userProfile?.premiumTier;
    if (tier === 'gold' || tier === 'black') return true; // Unlimited
    
    const editLimitMinutes = tier === 'silver' ? 60 : 15; // 60 mins for silver, 15 mins for free
    
    // If createdAt is null, it's a pending local write, so it was just created
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= editLimitMinutes;
  };

  const filteredPosts = useMemo(() => {
    return displayedPosts.filter(post => {
      // Basic Privacy Logic
      if (post.privacy === 'circle') {
        const circleMembers = post.audience || [];
        const isAuthor = post.authorId === userProfile?.uid || post.ownerId === userProfile?.uid;
        if (!isAuthor && !circleMembers.includes(userProfile?.uid)) return false;
      }
      
      // Hide posts from blocked users or if it's a private account (future logic)
      const isMuted = userProfile?.mutedUsers?.includes(post.authorId);
      const isBlocked = userProfile?.blockedUsers?.includes(post.authorId);
      if (isMuted || isBlocked) return false;

      if (!searchQuery.trim()) return true;

      const searchLower = searchQuery.toLowerCase();
      return (post.content?.toLowerCase().includes(searchLower)) ||
             (post.authorName?.toLowerCase().includes(searchLower)) ||
             (post.authorUsername?.toLowerCase().includes(searchLower));
    });
  }, [displayedPosts, userProfile?.mutedUsers, userProfile?.blockedUsers, searchQuery]);

  return (
    <div className="w-full min-h-full bg-transparent relative">
      {/* Ghost Loading Overlay */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          >
            <motion.div
              animate={{ 
                y: [0, -20, 0],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="bg-black p-8 rounded-[40px] shadow-2xl relative"
            >
              <Ghost className="w-16 h-16 text-white" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 rounded-[40px] -z-10 blur-xl"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-col items-center"
            >
              <h3 className="text-xl font-black italic tracking-tighter">Invocando novos posts...</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 px-8 text-center">Espere um pouco, as almas digitais estão chegando</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top,0px)]">
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
                  className={`relative px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all duration-300 z-10 flex-shrink-0 ${
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
                  Para Você
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`relative px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all duration-300 z-10 flex-shrink-0 ${
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
                  Seguindo
                </button>
                <button
                  onClick={() => setActiveTab('hashtags')}
                  className={`relative px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all duration-300 z-10 flex-shrink-0 ${
                    activeTab === 'hashtags' ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'hashtags' && (
                    <motion.div
                      layoutId="feed-tab-blob"
                      className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  Hashtags
                </button>
              </nav>
            </div>

            {/* Anonymous Post Buttons (Right) */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div 
        role="tabpanel" 
        id="feed-panel" 
        className="focus-visible:outline-none w-full max-w-2xl mx-auto"
      >
        <PullToRefresh onRefresh={refreshFeed}>
          {/* New Posts Notification Bubble */}
          <AnimatePresence>
            {newPostsCount > 0 && (
              <div className="flex justify-center sticky top-24 z-20 pointer-events-none">
                <motion.button
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  onClick={refreshFeed}
                  className="pointer-events-auto bg-blue-500 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 border border-blue-400 font-bold text-sm hover:bg-blue-600 transition-colors active:scale-95"
                >
                  <ArrowUp className="w-4 h-4 animate-bounce" />
                  <span>Novos posts disponíveis ({newPostsCount})</span>
                </motion.button>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-4 pb-24"
            >
              {isFetching ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <PostSkeleton key={i} />
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                activeTab === 'hashtags' ? (
                  <div className="p-8 text-center bg-gray-50/50 rounded-3xl border border-black/5 max-w-sm mx-auto shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Hash className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black italic tracking-tighter text-gray-900 mb-1">
                      Explore suas Hashtags
                    </h3>
                    <p className="text-xs text-gray-500 mb-5 max-w-[250px] mx-auto leading-relaxed">
                      {(userProfile?.followedHashtags || []).length === 0 
                        ? 'Comece a seguir hashtags para receber notificações e ter um feed personalizado com o que você ama!'
                        : 'Nenhuma postagem recente foi encontrada para as hashtags que você segue.'}
                    </p>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Hashtags Recomendadas</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['copa2026', 'futebol', 'brasil', 'messi', 'vini'].map((tag) => {
                          const isFollowing = (userProfile?.followedHashtags || []).includes(tag.toLowerCase());
                          return (
                            <button
                              key={tag}
                              onClick={() => isFollowing ? unfollowHashtag(tag) : followHashtag(tag)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center space-x-1 ${
                                isFollowing 
                                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/25' 
                                  : 'bg-white border border-black/5 hover:border-black/20 text-gray-700 shadow-sm'
                              }`}
                            >
                              <span>#{tag}</span>
                              <span className="text-[10px] opacity-75">
                                {isFollowing ? '✓' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {searchQuery ? <Search className="w-8 h-8 text-gray-300" /> : <MessageCircle className="w-8 h-8 text-gray-300" />}
                    </div>
                    <h3 className="text-lg font-black italic tracking-tighter text-gray-900 mb-1">
                      {searchQuery ? 'Nenhum resultado' : 'Nenhum post ainda'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                      {searchQuery ? `Não encontramos nada para "${searchQuery}"` : 'Seja o primeiro a compartilhar algo com o mundo!'}
                    </p>
                  </div>
                )
              ) : (
                <>
                  {filteredPosts.map((post, index) => (
                    <React.Fragment key={post.id}>
                      <PostCard
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
                    </React.Fragment>
                  ))}
                  
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
