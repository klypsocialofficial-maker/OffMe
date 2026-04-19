import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, ChevronRight, Globe, Shield, MessageSquare, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';
import Toast from '../components/Toast';

export default function Communities() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<any[]>([]);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my-communities'>('discover');
  
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

    const q = query(
      collection(db, 'communities'),
      orderBy('memberCount', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setCommunities(results);
      
      if (userProfile?.uid) {
        setMyCommunities(results.filter(c => c.members?.includes(userProfile.uid)));
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching communities:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, db]);

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black italic tracking-tighter">Comunidades</h1>
            <button 
              onClick={() => showToast('Criação de comunidades disponível em breve para Premium!', 'info')}
              className="p-2 transition-all active:scale-95 bg-black text-white rounded-full h-10 w-10 flex items-center justify-center shadow-lg shadow-black/10"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="relative group mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Encontrar comunidades..." 
              className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 outline-none border border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 transition-all text-sm"
            />
          </div>

          <div className="flex border-b border-black/5 mt-2">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`flex-1 py-3 text-sm font-bold transition-all relative ${activeTab === 'discover' ? 'text-black' : 'text-gray-500'}`}
            >
              Descobrir
              {activeTab === 'discover' && <motion.div layoutId="community-tab-indicator" className="absolute bottom-0 left-8 right-8 h-0.5 bg-black rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('my-communities')}
              className={`flex-1 py-3 text-sm font-bold transition-all relative ${activeTab === 'my-communities' ? 'text-black' : 'text-gray-500'}`}
            >
              Minhas Comunidades
              {activeTab === 'my-communities' && <motion.div layoutId="community-tab-indicator" className="absolute bottom-0 left-8 right-8 h-0.5 bg-black rounded-full" />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Carregando comunidades...</p>
          </div>
        ) : activeTab === 'discover' ? (
          <div className="space-y-4">
            {/* Featured Section */}
            {!searchQuery && (
              <div className="mb-6">
                <h2 className="text-lg font-black tracking-tight mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <span>Em alta agora</span>
                </h2>
                <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                  {communities.slice(0, 5).map((community) => (
                    <motion.div
                      key={`featured-${community.id}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/communities/${community.slug}`)}
                      className="w-64 flex-shrink-0 bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm relative group cursor-pointer"
                    >
                      <div className="h-24 bg-gray-200">
                        <LazyImage src={community.bannerUrl || `https://picsum.photos/seed/${community.slug}/400/200`} className="w-full h-full" />
                      </div>
                      <div className="p-4 pt-10 relative">
                        <div className="absolute -top-10 left-4 w-16 h-16 rounded-2xl bg-white p-1 shadow-lg border border-black/5 overflow-hidden">
                          <LazyImage src={community.iconUrl || `https://picsum.photos/seed/${community.slug}-icon/100/100`} className="w-full h-full rounded-xl" />
                        </div>
                        <h3 className="font-bold text-black truncate">{community.name}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{community.memberCount || 0} Membros</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {filteredCommunities.map((community) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/communities/${community.slug}`)}
                  className="p-4 bg-white rounded-3xl border border-black/5 shadow-sm flex items-center space-x-4 cursor-pointer hover:bg-gray-50 transition-all group active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gray-200 overflow-hidden flex-shrink-0 border border-black/5">
                    <LazyImage src={community.iconUrl || `https://picsum.photos/seed/${community.slug}-icon/100/100`} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-black truncate group-hover:text-blue-600 transition-colors">{community.name}</h3>
                    <p className="text-gray-500 text-xs truncate line-clamp-1">{community.description}</p>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{community.memberCount || 0}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{community.postsCount || 0}</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                </motion.div>
              ))}
            </div>

            {filteredCommunities.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900">Nenhuma comunidade encontrada</h3>
                <p className="text-gray-500 text-sm mt-1">Tente uma busca diferente ou crie a sua!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {myCommunities.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {myCommunities.map((community) => (
                  <motion.div
                    key={`my-${community.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/communities/${community.slug}`)}
                    className="p-4 bg-white rounded-3xl border border-black/5 shadow-sm flex items-center space-x-4 cursor-pointer hover:bg-gray-50 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gray-200 overflow-hidden flex-shrink-0 border border-black/5">
                      <LazyImage src={community.iconUrl || `https://picsum.photos/seed/${community.slug}-icon/100/100`} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black truncate">{community.name}</h3>
                      <p className="text-gray-500 text-xs truncate">{community.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900">Você ainda não participa de nada</h3>
                <p className="text-gray-500 text-sm mt-1 mb-6">Explore novas comunidades e conecte-se com pessoas incríveis.</p>
                <button 
                  onClick={() => setActiveTab('discover')}
                  className="px-6 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-black/10 active:scale-95 transition-all"
                >
                  Explorar Comunidades
                </button>
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
