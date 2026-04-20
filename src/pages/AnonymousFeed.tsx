import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Ghost, ArrowLeft } from 'lucide-react';
import PostCard from '../components/PostCard';
import PostSkeleton from '../components/PostSkeleton';
import { useAuth } from '../contexts/AuthContext';

export default function AnonymousFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  
  useEffect(() => {
    if (!db) return;
    
    // Assuming anonymous posts have authorId: 'anonymous'
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', 'anonymous'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
                onLike={() => {}}
                onRepost={() => {}}
                onDelete={() => {}}
                onEdit={() => {}}
                onShare={() => {}}
                onReply={() => {}}
                onQuote={() => {}}
                onImageClick={() => {}}
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
    </div>
  );
}
