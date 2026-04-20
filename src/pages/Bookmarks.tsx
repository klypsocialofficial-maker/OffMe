import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark, ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, serverTimestamp, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import PostSkeleton from '../components/PostSkeleton';
import { motion, AnimatePresence } from 'motion/react';
import { awardPoints } from '../services/gamificationService';
import { sendPushNotification } from '../lib/notifications';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import SharePostModal from '../components/SharePostModal';
import ImageViewer from '../components/ImageViewer';

export default function Bookmarks() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSharePost, setSelectedSharePost] = useState<any | null>(null);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    const fetchBookmarkedPosts = async () => {
      if (!userProfile?.bookmarks || userProfile.bookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const bookmarkedPosts: any[] = [];
        // Firestore 'in' query limit is 30. If user has more, we might need multiple queries.
        // For simplicity, let's handle up to 30 for now.
        const bookmarkIds = userProfile.bookmarks.slice(0, 30);
        
        const q = query(
          collection(db, 'posts'),
          where('__name__', 'in', bookmarkIds),
          where('privacy', '==', 'public')
        );
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by the order in bookmarks array (most recently added first)
        const sortedResults = [...results].sort((a, b) => {
          return userProfile.bookmarks!.indexOf(b.id) - userProfile.bookmarks!.indexOf(a.id);
        });

        setPosts(sortedResults);
      } catch (error) {
        console.error("Error fetching bookmarked posts:", error);
        showToast("Erro ao carregar itens salvos", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarkedPosts();
  }, [userProfile?.bookmarks]);

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleEditPost = async (post: any) => {
    // Navigate to a dedicated edit page if you have one, or open a modal
    // For now, let's assume it's handled by Home or a shared component
  };

  const handleLikePost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    // interaction logic (simplified copy from Home.tsx)
    const targetPost = post.type === 'repost' ? { id: post.repostedPostId, ...post } : post;
    const isLiked = targetPost.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', targetPost.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (targetPost.likesCount || 0) - 1) : (targetPost.likesCount || 0) + 1
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
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleRepost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    const targetPost = post.type === 'repost' ? { id: post.repostedPostId, ...post } : post;
    const isReposted = targetPost.reposts?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', targetPost.id);
    
    try {
      if (isReposted) {
        await updateDoc(postRef, {
          reposts: arrayRemove(userProfile.uid),
          repostsCount: Math.max(0, (targetPost.repostsCount || 0) - 1)
        });
      } else {
        await updateDoc(postRef, {
          reposts: arrayUnion(userProfile.uid),
          repostsCount: (targetPost.repostsCount || 0) + 1
        });
        
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
          content: targetPost.content || '',
          imageUrls: targetPost.imageUrls || [],
          originalPostAuthorId: targetPost.authorId,
          originalPostAuthorName: targetPost.authorName,
          originalPostAuthorUsername: targetPost.authorUsername,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
       console.error("Error reposting:", error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white relative pb-20">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Itens salvos</h2>
            <p className="text-xs text-gray-500">@{userProfile?.username}</p>
          </div>
        </div>
      </div>

      <div className="p-0">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bookmark className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Salve posts para depois</h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
                Não deixe posts bons escaparem! Adicione-os aos itens salvos para encontrá-los facilmente aqui.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="divide-y divide-gray-100"
            >
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLikePost}
                  onRepost={handleRepost}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                  onShare={(p) => {
                    setSelectedSharePost(p);
                    setIsShareModalOpen(true);
                  }}
                  onReply={(p) => navigate(`/post/${p.id}`)}
                  onQuote={(p) => navigate(`/post/${p.id}`)}
                  onImageClick={(src, alt) => {
                    setViewerImage({ src, alt });
                    setIsViewerOpen(true);
                  }}
                  canEdit={(p) => p.authorId === userProfile?.uid}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SharePostModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={selectedSharePost}
      />

      <ImageViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        src={viewerImage?.src || ''}
        alt={viewerImage?.alt || ''}
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
    </div>
  );
}
