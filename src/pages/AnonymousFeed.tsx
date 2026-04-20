import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Ghost, ArrowLeft } from 'lucide-react';
import PostCard from '../components/PostCard';
import PostSkeleton from '../components/PostSkeleton';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';

export default function AnonymousFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };
  
  useEffect(() => {
    if (!db) return;
    
    setLoading(true);
    // Assuming anonymous posts have authorId: 'anonymous'
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', 'anonymous'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Anonymous feed error:", error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [db]);

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      showToast('Post apagado com sucesso', 'success');
    } catch (error) {
      console.error("Error deleting anonymous post:", error);
      showToast('Erro ao apagar post', 'error');
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
    } catch (error) {
       console.error("Error liking post:", error);
    }
  };

  const handleRepost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    const isReposted = post.reposts?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', post.id);
    try {
      if (isReposted) {
        await updateDoc(postRef, {
          reposts: arrayRemove(userProfile.uid),
          repostsCount: Math.max(0, (post.repostsCount || 0) - 1)
        });
      } else {
        await updateDoc(postRef, {
          reposts: arrayUnion(userProfile.uid),
          repostsCount: (post.repostsCount || 0) + 1
        });
        await addDoc(collection(db, 'posts'), {
          authorId: userProfile.uid,
          authorName: userProfile.displayName,
          authorUsername: userProfile.username,
          authorPhoto: userProfile.photoURL || null,
          authorVerified: userProfile.isVerified || false,
          type: 'repost',
          repostedPostId: post.id,
          content: post.content || '',
          imageUrls: post.imageUrls || [],
          originalPostAuthorId: post.authorId,
          originalPostAuthorName: post.authorName,
          originalPostAuthorUsername: post.authorUsername,
          createdAt: serverTimestamp(),
          ownerId: userProfile.uid
        });
      }
    } catch (error) {
       console.error("Error reposting:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-2 rounded-full border border-purple-200">
                <Ghost className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter text-indigo-600">Feed Anônimo</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-4 px-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard 
                key={post.id}
                post={post}
                onLike={() => handleLikePost(post)}
                onRepost={() => handleRepost(post)}
                onDelete={() => handleDeletePost(post.id)}
                onEdit={(p) => navigate(`/post/${p.id}`)}
                onShare={() => {}}
                onReply={(p) => navigate(`/post/${p.id}`)}
                onQuote={(p) => navigate(`/post/${p.id}`)}
                onImageClick={(src, alt) => {}}
                canEdit={() => false}
              />
            ))}
            {posts.length === 0 && (
              <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-100 italic text-gray-500">
                Nenhum post anônimo encontrado.
              </div>
            )}
          </div>
        )}
      </div>
      <Toast 
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
