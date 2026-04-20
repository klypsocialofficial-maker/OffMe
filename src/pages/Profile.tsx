import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Calendar, MapPin, Link as LinkIcon, Edit2, Trash2, BarChart2, MessageCircle, Heart, Repeat, Send, MoreHorizontal, ArrowLeft, Search, Share, Briefcase, Plus, AlertCircle, Star, VolumeX, Volume2, UserX, Bookmark, Users } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';
import CreatePostModal from '../components/CreatePostModal';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import VerifiedBadge from '../components/VerifiedBadge';
import PostContent from '../components/PostContent';
import QuotedPost from '../components/QuotedPost';
import Poll from '../components/Poll';
import ImageViewer from '../components/ImageViewer';
import SharePostModal from '../components/SharePostModal';
import PostCard from '../components/PostCard';
import BadgeDisplay from '../components/BadgeDisplay';
import GamerCard from '../components/GamerCard';
import LazyImage from '../components/LazyImage';
import UserListModal from '../components/UserListModal';
import { handleMentions, sendPushNotification } from '../lib/notifications';
import { awardPoints } from '../services/gamificationService';
import { getDefaultAvatar } from '../lib/avatar';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayRemove, arrayUnion, addDoc, serverTimestamp, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
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

export default function Profile() {
  const [verificationSent, setVerificationSent] = useState(false);
  const { userProfile, currentUser, sendVerificationEmail, followUser, unfollowUser, muteUser, unmuteUser, blockUser, unblockUser, addToCircle, removeFromCircle } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes' | 'anonymous' | 'bookmarks' | 'circle'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [circleUsers, setCircleUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [quotePost, setQuotePost] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const [isScrolled, setIsScrolled] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isGamerCardOpen, setIsGamerCardOpen] = useState(false);
  const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
  const [userListTitle, setUserListTitle] = useState('');
  const [userListUids, setUserListUids] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (!db) return;

    if (username) {
      // Fetch user by username
      const q = query(collection(db, 'users'), where('username', '==', username));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setProfileUser({ uid: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          setProfileUser(null);
        }
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, `users?username=${username}`);
        }
      });
      return () => unsubscribe();
    } else {
      // Use current user's profile
      setProfileUser(userProfile);
    }
  }, [username, userProfile, db]);

  useEffect(() => {
    if (!profileUser?.uid || !db) return;

    setLoading(true);
    let unsubscribe: () => void;

    const isOwnProfile = profileUser?.uid === userProfile?.uid;

    if (activeTab === 'posts') {
      // Fetch user's posts and reposted posts
      const q1 = query(
        collection(db, 'posts'),
        where('authorId', '==', profileUser.uid),
        ...(isOwnProfile ? [] : [where('privacy', '==', 'public')]),
        orderBy('createdAt', 'desc')
      );
      const q2 = query(
        collection(db, 'posts'),
        where('reposts', 'array-contains', profileUser.uid),
        ...(isOwnProfile ? [] : [where('privacy', '==', 'public')]),
        orderBy('createdAt', 'desc')
      );

      let results1: any[] = [];
      let results2: any[] = [];

      const updateMergedPosts = () => {
        const merged = [...results1, ...results2];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        
        // Filter out replies for the main "Posts" tab
        const filtered = unique.filter((post: any) => !post.replyToId && !post.isAnonymous);
        
        setPosts(filtered);
        setLoading(false);
      };

      const unsub1 = onSnapshot(q1, (snapshot1) => {
        results1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateMergedPosts();
      }, (error) => {
        // Only log if not a permission error from logging out
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'posts_author');
        }
        setLoading(false);
      });

      const unsub2 = onSnapshot(q2, (snapshot2) => {
        results2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateMergedPosts();
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'posts_reposts');
        }
        setLoading(false);
      });

      unsubscribe = () => {
        unsub1();
        unsub2();
      };
    } else {
      let q;
      if (activeTab === 'likes') {
        q = query(
          collection(db, 'posts'),
          where('likes', 'array-contains', profileUser.uid),
          ...(isOwnProfile ? [] : [where('privacy', '==', 'public')]),
          orderBy('createdAt', 'desc')
        );
      } else if (activeTab === 'anonymous') {
        q = query(
          collection(db, 'posts'),
          where('ownerId', '==', profileUser.uid),
          where('isAnonymous', '==', true),
          orderBy('createdAt', 'desc')
        );
      } else if (activeTab === 'bookmarks') {
        if (!profileUser?.bookmarks || profileUser.bookmarks.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        // Bookmarks are only visible if isOwnProfile, but let's add protection anyway
        q = query(
          collection(db, 'posts'),
          where('__name__', 'in', profileUser.bookmarks.slice(0, 30)),
          ...(isOwnProfile ? [] : [where('privacy', '==', 'public')])
        );
      } else {
        q = query(
          collection(db, 'posts'),
          where('authorId', '==', profileUser.uid),
          ...(isOwnProfile ? [] : [where('privacy', '==', 'public')]),
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
          results = results.filter(post => post.imageUrls && post.imageUrls.length > 0);
        } else if (activeTab === 'bookmarks') {
          // Sort bookmarks by the order in the list
          results.sort((a, b) => {
            return profileUser.bookmarks!.indexOf(b.id) - profileUser.bookmarks!.indexOf(a.id);
          });
        }

        setPosts(results);
        setLoading(false);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'posts');
        }
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [profileUser?.uid, activeTab, db]);

  useEffect(() => {
    if (!profileUser?.uid || !userProfile?.uid || !db || profileUser.uid !== userProfile.uid) return;

    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('uid', '!=', userProfile.uid),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => doc.data())
          .filter((u: any) => !userProfile.following?.includes(u.uid))
          .slice(0, 3);
        setSuggestedUsers(users);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [profileUser?.uid, userProfile?.uid, db]);

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
          const repostDocId = snapshot.docs[0].id;
          await deleteDoc(doc(db, 'posts', repostDocId));
          setPosts(prev => prev.filter(p => p.id !== repostDocId));
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

  const handleCircleToggle = async () => {
    if (!userProfile?.uid || !profileUser?.uid || !db || profileUser.uid === userProfile.uid) return;
    const isInCircle = userProfile.circleMembers?.includes(profileUser.uid);
    try {
      if (isInCircle) {
        await removeFromCircle(profileUser.uid);
        showToast(`Removido do seu Círculo`, 'info');
      } else {
        await addToCircle(profileUser.uid);
        showToast(`Adicionado ao seu Círculo`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  useEffect(() => {
    if (activeTab === 'circle' && profileUser?.uid === userProfile?.uid && userProfile?.circleMembers?.length > 0) {
      const q = query(collection(db, 'users'), where('uid', 'in', userProfile.circleMembers.slice(0, 10)));
      getDocs(q).then(snap => {
        setCircleUsers(snap.docs.map(d => d.data()));
      });
    }
  }, [activeTab, userProfile?.circleMembers, profileUser?.uid]);

  const handleFollowClick = async () => {
    if (!userProfile?.uid || !profileUser?.uid || !db || profileUser.uid === userProfile.uid) return;
    
    const isFollowing = userProfile.following?.includes(profileUser.uid);
    
    if (isFollowing) {
      setConfirmModal({
        isOpen: true,
        title: `Deixar de seguir @${profileUser.username}?`,
        message: `As publicações de @${profileUser.username} não aparecerão mais na sua aba Seguindo.`,
        onConfirm: async () => {
          try {
            await unfollowUser(profileUser.uid);
            showToast(`Você deixou de seguir @${profileUser.username}`, 'info');
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'users');
          }
        }
      });
      return;
    }

    try {
      await followUser(profileUser.uid);
      showToast(`Agora você segue @${profileUser.username}`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile?.uid) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
      setActiveMenuPostId(null);
      showToast('Post apagado com sucesso', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
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
    if (!db || !userProfile?.uid || !editContent.trim() || editContent.length > 1000) return;
    
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

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  const handleSendVerification = async () => {
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
      showToast('Email de verificação enviado!', 'success');
    } catch (error: any) {
      showToast('Erro ao enviar email: ' + error.message, 'error');
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

  // Dynamically sort posts based on current pinned status
  const pinnedIds = profileUser?.pinnedPostIds || [];
  const displayPosts = [...posts].sort((a: any, b: any) => {
    if (activeTab === 'posts') {
      const aIsPinned = pinnedIds.includes(a.id) && !a.type;
      const bIsPinned = pinnedIds.includes(b.id) && !b.type;
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
    }
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
    return dateB.getTime() - dateA.getTime();
  });

  const getThemeStyles = () => {
    switch (profileUser?.profileTheme) {
      case 'minimal': // Nuvem
        return {
          header: 'bg-gradient-to-b from-blue-50 to-white',
          card: 'bg-white/60 backdrop-blur-md border border-blue-100 shadow-sm',
          text: 'text-slate-800',
          accent: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
          tabs: 'bg-blue-50/50'
        };
      case 'vibrant': // Crepúsculo
        return {
          header: 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10',
          card: 'bg-white/80 backdrop-blur-lg border border-purple-100 shadow-xl shadow-purple-500/5',
          text: 'text-indigo-950',
          accent: 'text-purple-600',
          button: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-purple-200 text-white',
          tabs: 'bg-purple-50/50'
        };
      case 'neon': // Cyber
        return {
          header: 'bg-stone-950',
          card: 'bg-stone-900 border border-stone-800 shadow-2xl',
          text: 'text-stone-100',
          accent: 'text-amber-400',
          button: 'bg-amber-400 hover:bg-amber-500 text-black font-black',
          tabs: 'bg-stone-800'
        };
      default:
        return {
          header: 'bg-white',
          card: 'bg-white',
          text: 'text-black',
          accent: 'text-black',
          button: 'bg-black hover:bg-gray-900 text-white',
          tabs: 'bg-white'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className={`w-full min-h-full transition-colors duration-500 ${theme.header}`}>
      {/* Profile Header with Cover Photo and Action Buttons */}
      <div className="relative">
        {/* Top Action Bar (Floating on Cover) - Glass Effect */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)]">
          <div className="p-4 flex justify-between items-center">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/30 transition-all active:scale-90 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex space-x-2">
              <button className="p-2.5 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/30 transition-all active:scale-90 shadow-sm">
                <Search className="w-5 h-5" />
              </button>
              {profileUser.uid === userProfile?.uid && (
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2.5 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/30 transition-all active:scale-90 shadow-sm"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              <button className="p-2.5 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/30 transition-all active:scale-90 shadow-sm">
                <Share className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Cover Photo */}
        <div 
          className="h-40 sm:h-56 bg-gray-100 w-full relative overflow-hidden cursor-zoom-in"
          onClick={() => profileUser.bannerURL && openImageViewer(profileUser.bannerURL, `Banner de ${profileUser.displayName}`)}
        >
          <LazyImage src={profileUser.bannerURL || `https://picsum.photos/seed/${profileUser.uid}/800/400`} alt="Banner" className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white/10"></div>
        </div>

        {/* Profile Photo (Overlapping) */}
        <div className="absolute -bottom-12 left-4 sm:left-8 z-10 group/avatar">
          <div 
            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl cursor-zoom-in transform transition-transform active:scale-95 ${theme.card}`}
            onClick={() => profileUser.photoURL && openImageViewer(profileUser.photoURL, `Avatar de ${profileUser.displayName}`)}
          >
            <LazyImage src={profileUser.photoURL || getDefaultAvatar(profileUser.displayName, profileUser.username)} alt={profileUser.displayName} className="w-full h-full" />
          </div>
          
          {/* Level Star Badge */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsGamerCardOpen(true);
            }}
            className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-yellow-400 to-orange-400 p-2 rounded-full border-4 border-white shadow-lg text-black hover:scale-110 active:scale-90 transition-all z-20"
          >
            <Star className="w-4 h-4 fill-black" />
            <div className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {profileUser.level || 1}
            </div>
          </button>
        </div>
      </div>

      {/* Profile Details */}
      <div className={`px-5 sm:px-8 pt-14 pb-6 transition-colors duration-500 ${theme.header === 'bg-white' ? '' : theme.text}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h2 className={`text-xl sm:text-2xl font-black italic tracking-tighter truncate ${theme.text}`}>
                {profileUser.displayName}
              </h2>
              {(profileUser.isVerified || profileUser.username === 'Rulio') && (
                <VerifiedBadge className={`w-5 h-5 flex-shrink-0 ${theme.accent}`} tier={profileUser.premiumTier} />
              )}
            </div>
            <p className="opacity-60 text-sm sm:text-base">@{profileUser.username}</p>
            {currentUser && profileUser.uid === currentUser.uid && !currentUser.emailVerified && (
              <button 
                onClick={handleSendVerification}
                disabled={verificationSent}
                className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
              >
                {verificationSent ? 'Email enviado!' : 'Enviar verificação de email'}
              </button>
            )}
          </div>
          
          {profileUser.uid !== userProfile?.uid && (
            <div className="flex space-x-2">
              <button 
                onClick={async () => {
                  try {
                    if (userProfile?.mutedUsers?.includes(profileUser.uid)) {
                      await unmuteUser(profileUser.uid);
                      showToast(`Você desmutou @${profileUser.username}`, 'info');
                    } else {
                      await muteUser(profileUser.uid);
                      showToast(`Você mutou @${profileUser.username}`, 'success');
                    }
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'users');
                  }
                }}
                className={`p-2 border rounded-full transition-all active:scale-95 ${
                  userProfile?.mutedUsers?.includes(profileUser.uid)
                    ? 'bg-red-50 border-red-100 text-red-500'
                    : 'border-gray-200 text-current hover:bg-white/10'
                }`}
                title={userProfile?.mutedUsers?.includes(profileUser.uid) ? 'Desmutar' : 'Mutar'}
              >
                {userProfile?.mutedUsers?.includes(profileUser.uid) ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (userProfile?.blockedUsers?.includes(profileUser.uid)) {
                      await unblockUser(profileUser.uid);
                      showToast(`Você desbloqueou @${profileUser.username}`, 'info');
                    } else {
                      await blockUser(profileUser.uid);
                      showToast(`Você bloqueou @${profileUser.username}`, 'success');
                    }
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'users');
                  }
                }}
                className={`p-2 border rounded-full transition-all active:scale-95 ${
                  userProfile?.blockedUsers?.includes(profileUser.uid)
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-gray-200 text-current hover:bg-white/10'
                }`}
                title={userProfile?.blockedUsers?.includes(profileUser.uid) ? 'Desbloquear' : 'Bloquear'}
              >
                <UserX className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCircleToggle}
                className={`p-2 border rounded-full transition-all active:scale-95 ${
                  userProfile?.circleMembers?.includes(profileUser.uid)
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'border-gray-200 text-current hover:bg-white/10'
                }`}
                title={userProfile?.circleMembers?.includes(profileUser.uid) ? 'Remover do Círculo' : 'Adicionar ao Círculo'}
              >
                <Users className="w-4 h-4" />
              </button>
              <button 
                onClick={handleMessageClick}
                className="p-2 border border-black/10 rounded-full hover:bg-white/10 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-current" />
              </button>
              <button 
                onClick={handleFollowClick}
                className={`px-5 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
                  userProfile?.following?.includes(profileUser.uid)
                    ? 'border border-gray-200 text-gray-500 hover:bg-white/10'
                    : `shadow-sm ${theme.button}`
                }`}
              >
                {userProfile?.following?.includes(profileUser.uid) ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          )}
        </div>

        {/* Blocked Overlay Message */}
        {userProfile?.blockedUsers?.includes(profileUser.uid) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-red-800 font-bold">Você bloqueou @{profileUser.username}</p>
              <p className="text-red-600 text-xs">Os posts e interações deste usuário estão ocultos.</p>
            </div>
            <button 
              onClick={() => unblockUser(profileUser.uid)}
              className="px-4 py-2 bg-red-600 text-white rounded-full font-bold text-sm hover:bg-red-700 transition-colors"
            >
              Desbloquear
            </button>
          </div>
        )}

        {/* Bio with Stylized Look */}
        {profileUser.bio && (
          <div className={`mt-3 opacity-90 text-sm sm:text-base leading-relaxed max-w-xl ${theme.text}`}>
            {profileUser.bio.length > 150 ? (
              <>
                <p className={`${!showMore ? 'line-clamp-3' : ''}`}>
                  {profileUser.bio}
                </p>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className={`mt-1 font-bold hover:underline ${theme.accent}`}
                >
                  {showMore ? 'Mostrar menos' : 'Mostrar mais'}
                </button>
              </>
            ) : (
              <p>{profileUser.bio}</p>
            )}
          </div>
        )}

        <BadgeDisplay badges={profileUser.badges} />

        {/* Metadata Grid */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 opacity-60 text-sm">
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
          <button 
            className="flex items-center space-x-1.5 group"
            onClick={() => {
              setUserListTitle('Seguindo');
              setUserListUids(profileUser.following || []);
              setIsUserListModalOpen(true);
            }}
          >
            <span className={`font-bold ${theme.text}`}>{profileUser.following?.length || 0}</span>
            <span className="opacity-60 group-hover:underline text-sm">Seguindo</span>
          </button>
          <button 
            className="flex items-center space-x-1.5 group"
            onClick={() => {
              setUserListTitle('Seguidores');
              setUserListUids(profileUser.followers || []);
              setIsUserListModalOpen(true);
            }}
          >
            <span className={`font-bold ${theme.text}`}>{profileUser.followers?.length || 0}</span>
            <span className="opacity-60 group-hover:underline text-sm">Seguidores</span>
          </button>
        </div>

        {/* Suggested Users Section */}
        {profileUser.uid === userProfile?.uid && suggestedUsers.length > 0 && (
          <div className="mt-8 mb-4">
            <h3 className="text-lg font-black italic tracking-tight text-black mb-4">Você também pode gostar</h3>
            <div className="flex flex-col space-y-4">
              {suggestedUsers.map((user) => (
                <div key={user.uid} className="flex items-center justify-between group">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => navigate(`/${user.username}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-transparent group-hover:ring-black transition-all">
                      <LazyImage 
                        src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} 
                        alt={user.displayName} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <p className="font-bold text-sm text-black truncate group-hover:underline">{user.displayName}</p>
                        {user.isVerified && <VerifiedBadge className="w-3 h-3" tier={user.premiumTier} />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await followUser(user.uid);
                        setSuggestedUsers(prev => prev.filter(u => u.uid !== user.uid));
                        showToast(`Seguindo @${user.username}`, 'success');
                      } catch (err) {
                        console.error('Error following suggested user:', err);
                      }
                    }}
                    className="px-4 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition-all active:scale-95"
                  >
                    Seguir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className={`sticky top-0 z-20 flex justify-center py-2 sm:py-3 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[calc(env(safe-area-inset-top)+8px)]' : 'bg-white/80 backdrop-blur-xl border-b border-gray-100'}`}>
        <div className="w-full max-w-[280px] overflow-hidden relative">
          {/* Fading edges for scroll indication */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none"></div>
          
          <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative border border-white/40 shadow-sm overflow-x-auto hide-scrollbar snap-x snap-mandatory">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`relative w-1/2 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'posts' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
            >
              {activeTab === 'posts' && (
                <motion.div
                  layoutId="profile-tab-blob"
                  className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              Posts
            </button>
            <button 
              onClick={() => setActiveTab('replies')}
              className={`relative w-1/2 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'replies' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
            >
              {activeTab === 'replies' && (
                <motion.div
                  layoutId="profile-tab-blob"
                  className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              Respostas
            </button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`relative w-1/2 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'media' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
            >
              {activeTab === 'media' && (
                <motion.div
                  layoutId="profile-tab-blob"
                  className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              Mídia
            </button>
            <button 
              onClick={() => setActiveTab('likes')}
              className={`relative w-1/2 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'likes' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
            >
              {activeTab === 'likes' && (
                <motion.div
                  layoutId="profile-tab-blob"
                  className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              Curtidas
            </button>
            {profileUser.uid === userProfile?.uid && (
              <button 
                onClick={() => setActiveTab('bookmarks')}
                className={`relative w-1/2 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'bookmarks' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
              >
                {activeTab === 'bookmarks' && (
                  <motion.div
                    layoutId="profile-tab-blob"
                    className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                Salvos
              </button>
            )}
            {profileUser.uid === userProfile?.uid && (
              <button 
                onClick={() => setActiveTab('anonymous')}
                className={`relative w-1/3 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'anonymous' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
              >
                {activeTab === 'anonymous' && (
                  <motion.div
                    layoutId="profile-tab-blob"
                    className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                Anônimos
              </button>
            )}
            {profileUser.uid === userProfile?.uid && (
              <button 
                onClick={() => setActiveTab('circle')}
                className={`relative w-1/3 flex-shrink-0 px-4 py-2 text-sm font-bold transition-colors duration-300 z-10 snap-center ${activeTab === 'circle' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
              >
                {activeTab === 'circle' && (
                  <motion.div
                    layoutId="profile-tab-blob"
                    className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                Círculo
              </button>
            )}
          </nav>
        </div>
      </div>

      <div className="pb-20">
        {loading && activeTab !== 'circle' ? (
          <div className="p-12 text-center text-gray-400 font-medium">Carregando conteúdo...</div>
        ) : activeTab === 'circle' ? (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4">
              <p className="text-emerald-800 font-bold text-sm">Seu Círculo do OffMe</p>
              <p className="text-emerald-600 text-xs mt-1">Pessoas que podem ver e responder aos seus posts exclusivos para o círculo.</p>
            </div>
            {circleUsers.length > 0 ? (
              circleUsers.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-3 liquid-glass-card rounded-2xl">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => navigate(`/${user.username}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                      <LazyImage src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} className="w-full h-full" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <p className="font-bold text-sm">{user.displayName}</p>
                        {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge className="w-3 h-3" tier={user.premiumTier} />}
                      </div>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCircle(user.uid)}
                    className="px-4 py-1.5 bg-red-50 text-red-500 rounded-full text-xs font-bold hover:bg-red-100 transition-all"
                  >
                    Remover
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="font-bold text-black mb-1">Seu círculo está vazio</p>
                <p className="text-sm">Adicione pessoas visitando o perfil delas.</p>
              </div>
            )}
          </div>
        ) : displayPosts.length > 0 ? (
          <div className="px-4 space-y-4">
            {displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isProfilePinned={activeTab === 'posts' && pinnedIds.includes(post.id) && !post.type}
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

      <Toast 
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Gamer Card Modal */}
      <AnimatePresence>
        {isGamerCardOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGamerCardOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <div className="absolute -top-12 right-0">
                <button 
                  onClick={() => setIsGamerCardOpen(false)}
                  className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <GamerCard 
                level={profileUser.level} 
                points={profileUser.points} 
                displayName={profileUser.displayName} 
              />
              <div className="mt-4 text-center">
                <p className="text-white/60 text-xs font-medium">Toque fora para fechar</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <SharePostModal 
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedSharePost(null);
        }}
        post={selectedSharePost}
      />

      <ImageViewer 
        src={viewerImage?.src || null}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        alt={viewerImage?.alt}
      />

      <UserListModal 
        isOpen={isUserListModalOpen}
        onClose={() => setIsUserListModalOpen(false)}
        title={userListTitle}
        uids={userListUids}
      />
    </div>
  );
}
