import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { UserProfile, Post } from '../types';
import PostCard from './PostCard';
import EditProfileModal from './EditProfileModal';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, Edit3, Loader2, UserPlus, UserMinus, MessageCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { socialService } from '../services/socialService';
import { chatService } from '../services/chatService';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');
  const { profile: currentUserProfile } = useProfile();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!userId) return;

    // Real-time profile updates
    const unsubscribeProfile = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        setProfile({ uid: doc.id, ...doc.data() } as UserProfile);
      }
    }, (err) => {
      console.error('Profile fetch error:', err);
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    // Real-time follow status
    let unsubscribeFollow = () => {};
    if (currentUser && currentUser.uid !== userId) {
      const followId = `${currentUser.uid}_${userId}`;
      unsubscribeFollow = onSnapshot(doc(db, 'follows', followId), (doc) => {
        setIsFollowing(doc.exists());
      });
    }

    let q;
    let unsubscribePosts = () => {};
    let unsubscribeLikes = () => {};
    let unsubscribeLikesInner = () => {};

    if (activeTab === 'Likes') {
      const likesQuery = query(
        collection(db, 'likes'),
        where('userId', '==', userId)
      );

      unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
        const likesData = snapshot.docs.map(doc => doc.data());
        likesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        const postIds = likesData.map(data => data.postId);
        if (postIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        const limitedPostIds = postIds.slice(0, 30);
        const postsQuery = query(
          collection(db, 'posts'),
          where('id', 'in', limitedPostIds)
        );

        if (unsubscribeLikesInner) unsubscribeLikesInner();
        unsubscribeLikesInner = onSnapshot(postsQuery, (postsSnapshot) => {
          const postsData = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
          
          const sortedPosts = postsData.sort((a, b) => {
            const indexA = limitedPostIds.indexOf(a.id);
            const indexB = limitedPostIds.indexOf(b.id);
            return indexA - indexB;
          });

          setPosts(sortedPosts);
          setLoading(false);
        });
      }, (err) => {
        console.error('Likes fetch error:', err);
        setLoading(false);
      });
    } else {
      // Fetch all posts by user and filter/sort in memory to avoid composite indexes
      q = query(
        collection(db, 'posts'),
        where('authorUid', '==', userId),
        limit(200)
      );
    }

    if (q) {
      unsubscribePosts = onSnapshot(q, (snapshot) => {
        let postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        if (activeTab === 'Posts') {
          postsData = postsData.filter(post => !post.parentPostId);
          postsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        } else if (activeTab === 'Replies') {
          postsData = postsData.filter(post => !!post.parentPostId);
          postsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        } else if (activeTab === 'Highlights') {
          postsData.sort((a, b) => {
            if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
          });
        } else if (activeTab === 'Media') {
          postsData = postsData.filter(post => !!post.imageUrl);
          postsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        } else {
          postsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        }

        setPosts(postsData.slice(0, 50));
        setLoading(false);
      }, (err) => {
        console.error('Profile posts error:', err);
        if (err.code !== 'failed-precondition') {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        }
        setLoading(false);
      });
    }

    return () => {
      unsubscribeProfile();
      unsubscribeFollow();
      unsubscribePosts();
      unsubscribeLikes();
      if (unsubscribeLikesInner) unsubscribeLikesInner();
    };
  }, [userId, currentUser, activeTab]);

  const handleFollow = async () => {
    if (!currentUser || !currentUserProfile || !userId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollowUser(currentUser.uid, userId);
      } else {
        await socialService.followUser(currentUser.uid, userId, currentUserProfile);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !currentUserProfile || !profile || followLoading) return;
    setFollowLoading(true);
    try {
      const conversationId = await chatService.getOrCreateConversation(currentUserProfile, profile);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } catch (err) {
      console.error('Message error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 text-black animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h2 className="text-2xl font-black mb-2 tracking-tight">User not found</h2>
        <p className="text-gray-400 font-medium mb-8">This account doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-4 py-2 sm:px-6 sm:py-4 flex items-center gap-4 sm:gap-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tighter text-black">{profile.displayName}</h1>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">{profile.postsCount || 0} Posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 sm:h-48 bg-gray-100 relative">
        {profile.bannerURL && (
          <img 
            src={profile.bannerURL} 
            alt="Banner" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-6 p-1 bg-white rounded-full shadow-xl z-10">
          <img
            src={profile.photoURL || 'https://picsum.photos/seed/user/200/200'}
            alt={profile.displayName}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-12 sm:mt-16 px-4 sm:px-6 pb-6 border-b border-gray-100 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-black truncate">{profile.displayName}</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-400 font-medium truncate">@{profile.username}</p>
          </div>
          
          <div className="flex-shrink-0">
            {currentUser?.uid === profile.uid ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 sm:px-6 sm:py-2 border-2 border-black text-black rounded-full font-bold text-sm sm:text-base hover:bg-black hover:text-white transition-all flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMessage}
                  disabled={followLoading}
                  className="p-2 sm:p-3 border-2 border-black text-black rounded-full hover:bg-black hover:text-white transition-all active:scale-95 disabled:opacity-30"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={cn(
                    "px-6 py-1.5 sm:px-8 sm:py-2 rounded-full font-bold text-sm sm:text-base transition-all flex items-center gap-2",
                    isFollowing 
                      ? "border-2 border-gray-200 text-black hover:border-red-200 hover:text-red-500 hover:bg-red-50" 
                      : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  {followLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-base sm:text-lg text-gray-800 font-medium leading-relaxed">
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-gray-400 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>OffMe Web</span>
          </div>
          <div className="flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span className="text-black hover:underline cursor-pointer truncate max-w-[150px] sm:max-w-none">offme.app/{profile.username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span>Joined {profile.createdAt ? format(profile.createdAt.toDate(), 'MMMM yyyy') : 'Recently'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 pt-2">
          <div className="flex items-center gap-1 group cursor-pointer">
            <span className="font-black text-black text-sm sm:text-base">{profile.followingCount || 0}</span>
            <span className="text-gray-400 font-medium text-sm sm:text-base group-hover:underline">Following</span>
          </div>
          <div className="flex items-center gap-1 group cursor-pointer">
            <span className="font-black text-black text-sm sm:text-base">{profile.followersCount || 0}</span>
            <span className="text-gray-400 font-medium text-sm sm:text-base group-hover:underline">Followers</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <EditProfileModal
            profile={profile}
            onClose={() => setIsEditing(false)}
            onUpdate={(updated) => setProfile(updated)}
          />
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
        {['Posts', 'Replies', 'Highlights', 'Media', 'Likes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 min-w-[80px] py-4 text-[10px] sm:text-sm font-bold tracking-widest uppercase transition-all relative whitespace-nowrap",
              activeTab === tab ? "text-black" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabProfile"
                className="absolute bottom-0 left-0 right-0 h-1 bg-black"
              />
            )}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      <div className="flex-1">
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </AnimatePresence>

        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <h2 className="text-2xl font-black mb-2 tracking-tight">No posts yet</h2>
            <p className="text-gray-400 font-medium">When they post, their thoughts will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
