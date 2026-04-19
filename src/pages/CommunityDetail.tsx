import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Shield, Globe, MoreHorizontal, Plus, Share, AlertCircle, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, updateDoc, arrayUnion, arrayRemove, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import LazyImage from '../components/LazyImage';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function CommunityDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (!db || !slug) return;

    setLoading(true);
    
    // Fetch community info
    const q = query(
      collection(db, 'communities'),
      where('slug', '==', slug),
      limit(1)
    );

    const unsubscribeCommunity = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const communityData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setCommunity(communityData);

        // Fetch community posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('communityId', '==', communityData.id),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const unsubscribePosts = onSnapshot(postsQuery, (postSnapshot) => {
          setPosts(postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        return () => unsubscribePosts();
      } else {
        setCommunity(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching community:", error);
      setLoading(false);
    });

    return () => unsubscribeCommunity();
  }, [slug, db]);

  const handleJoinLeave = async () => {
    if (!userProfile?.uid || !community) return;
    setIsJoining(true);
    
    const isMember = community.members?.includes(userProfile.uid);
    const communityRef = doc(db, 'communities', community.id);
    const userRef = doc(db, 'users', userProfile.uid);

    try {
      await updateDoc(communityRef, {
        members: isMember ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        memberCount: isMember ? Math.max(0, (community.memberCount || 0) - 1) : (community.memberCount || 0) + 1
      });
      
      showToast(isMember ? `Você saiu de ${community.name}` : `Você entrou em ${community.name}!`, 'success');
    } catch (error) {
      console.error("Error joining/leaving community:", error);
      showToast('Erro ao realizar esta ação', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading && !community) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-8 text-center text-gray-500">Comunidade não encontrada</div>
    );
  }

  const isMember = community.members?.includes(userProfile?.uid);

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-sm truncate uppercase tracking-tighter">{community.name}</h2>
            <p className="text-[10px] text-gray-500 font-bold">{community.memberCount || 0} Membros</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Share className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Banner */}
        <div className="h-32 sm:h-48 bg-gray-100 overflow-hidden">
          <LazyImage src={community.bannerUrl || `https://picsum.photos/seed/${community.slug}/800/400`} className="w-full h-full" />
        </div>
        {/* Community Icon */}
        <div className="absolute -bottom-10 left-6 w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-white p-1 shadow-2xl border-4 border-white overflow-hidden z-10">
          <LazyImage src={community.iconUrl || `https://picsum.photos/seed/${community.slug}-icon/200/200`} className="w-full h-full rounded-2xl" />
        </div>
      </div>

      <div className="px-6 pt-12 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{community.name}</h1>
          <p className="text-gray-500 text-sm mt-1">offme.com/c/{community.slug}</p>
        </div>
        <button 
          onClick={handleJoinLeave}
          disabled={isJoining}
          className={`px-8 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg ${
            isMember 
            ? 'bg-gray-100 text-gray-700 border border-black/5 hover:bg-red-50 hover:text-red-500 hover:border-red-100' 
            : 'bg-black text-white hover:bg-gray-900 shadow-black/10'
          }`}
        >
          {isMember ? 'Sair' : 'Entrar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5 px-6">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`py-4 text-sm font-bold transition-all relative mr-8 ${activeTab === 'posts' ? 'text-black' : 'text-gray-500'}`}
        >
          Discussão
          {activeTab === 'posts' && <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('about')}
          className={`py-4 text-sm font-bold transition-all relative ${activeTab === 'about' ? 'text-black' : 'text-gray-500'}`}
        >
          Sobre
          {activeTab === 'about' && <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />}
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'posts' ? (
          <div>
            {isMember && (
              <div 
                onClick={() => setIsCreateModalOpen(true)}
                className="p-4 border-b border-black/5 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  <LazyImage src={userProfile?.photoURL || `https://avatar.vercel.sh/${userProfile?.username || 'user'}`} alt="Avatar" className="w-full h-full" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-gray-400 group-hover:bg-gray-200 transition-colors flex items-center justify-between">
                  <span>No que você está pensando?</span>
                  <Plus className="w-5 h-5" />
                </div>
              </div>
            )}

            {posts.length > 0 ? (
              <div className="divide-y divide-black/5">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post}
                    onLike={() => {}} // Handle in PostCard or add functions here
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
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 italic">O silêncio reina por aqui...</h3>
                <p className="text-gray-500 text-sm mt-1">Seja o primeiro a começar a conversa!</p>
                {isMember && (
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-6 px-6 py-2 bg-black text-white rounded-2xl font-bold text-sm hover:translate-y-[-2px] transition-all"
                  >
                    Postar na Comunidade
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 space-y-8">
            <section>
              <h2 className="text-lg font-black tracking-tight mb-3 flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span>Propósito</span>
              </h2>
              <p className="text-gray-700 leading-relaxed italic">{community.description}</p>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-3xl border border-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Membros</h3>
                <p className="text-xl font-bold">{community.memberCount || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-3xl border border-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Criação</h3>
                <p className="text-xl font-bold">
                  {community.createdAt?.toDate ? new Date(community.createdAt.toDate()).toLocaleDateString('pt-BR') : '2024'}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black tracking-tight mb-3 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span>Moderadores</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {community.moderatorIds?.map((id: string) => (
                  <div key={id} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gray-300 overflow-hidden">
                       <LazyImage src={`https://avatar.vercel.sh/${id}`} />
                    </div>
                    <span>ID: {id.substring(0, 6)}</span>
                  </div>
                ))}
                {!community.moderatorIds?.length && (
                  <p className="text-gray-400 text-sm italic">Comunidade gerida pelo OffMe</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userProfile={userProfile}
        communityId={community.id}
        communityName={community.name}
        handleFirestoreError={() => {}}
        OperationType={{ CREATE: 'create' }}
      />

      <Toast 
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
