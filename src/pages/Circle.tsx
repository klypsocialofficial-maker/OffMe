import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Search, X, Shield, Sparkles, UserPlus, Trash2, ArrowLeft } from 'lucide-react';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import VerifiedBadge from '../components/VerifiedBadge';
import { getDefaultAvatar } from '../lib/avatar';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Circle() {
  const { userProfile, addToCircle, removeFromCircle } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [circleUsers, setCircleUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'info' as 'info' | 'success' | 'error' });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ isOpen: true, message, type });
  };

  useEffect(() => {
    const fetchCircleUsers = async () => {
      if (!userProfile?.circleMembers?.length || !db) {
        setCircleUsers([]);
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'users'),
          where('uid', 'in', userProfile.circleMembers.slice(0, 10))
        );
        const snapshot = await getDocs(q);
        setCircleUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching circle users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircleUsers();
  }, [userProfile?.circleMembers, db]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const searchUsers = async () => {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', searchTerm.toLowerCase()),
          where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snap = await getDocs(q);
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => (u as any).uid !== userProfile?.uid));
      };
      const timeout = setTimeout(searchUsers, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, userProfile?.uid]);

  const handleToggleCircle = async (user: any) => {
    const isInCircle = userProfile?.circleMembers?.includes(user.uid);
    try {
      if (isInCircle) {
        await removeFromCircle(user.uid);
        showToast(`Removido do seu Círculo`, 'info');
      } else {
        await addToCircle(user.uid);
        showToast(`Adicionado ao seu Círculo`, 'success');
      }
    } catch (error) {
      showToast('Erro ao atualizar círculo', 'error');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 relative pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 h-14 space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black italic tracking-tighter">Círculo do OffMe</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-500/20 mb-8 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Espaço Privado</span>
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter mb-2">Configure seu Círculo</h2>
            <p className="text-emerald-50 text-sm leading-relaxed opacity-90">
              Posts enviados para o Círculo só podem ser vistos pelas pessoas que você adicionar aqui. Elas não saberão quem mais está no seu círculo.
            </p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-32 h-32 rotate-12 translate-x-8 -translate-y-8" />
          </div>
        </motion.div>

        {/* Search Section */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar seguidores por @username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-black/5 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-4 ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-4 flex items-center p-2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {searchTerm ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resultados da busca</p>
                {searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div key={user.id} className="bg-white border border-black/5 p-4 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white">
                          <LazyImage src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <p className="font-bold text-sm tracking-tight">{user.displayName}</p>
                            {user.isVerified && <VerifiedBadge tier={user.premiumTier} className="w-[14px] h-[14px]" />}
                          </div>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleCircle(user)}
                        className={`px-6 py-2 rounded-full text-xs font-black transition-all active:scale-95 ${
                          userProfile?.circleMembers?.includes(user.uid)
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'
                        }`}
                      >
                        {userProfile?.circleMembers?.includes(user.uid) ? 'REMOVER' : 'ADICIONAR'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">Nenhum usuário encontrado</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="members"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Integrantes do Círculo ({userProfile?.circleMembers?.length || 0})</p>
                </div>
                
                {circleUsers.length > 0 ? (
                  <div className="grid gap-3">
                    {circleUsers.map(user => (
                      <div key={user.id} className="bg-white border border-black/5 p-4 rounded-3xl flex items-center justify-between shadow-sm group hover:border-emerald-200 transition-colors">
                        <div 
                          className="flex items-center space-x-3 cursor-pointer flex-1"
                          onClick={() => navigate(`/${user.username}`)}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 group-hover:ring-2 ring-emerald-500 transition-all">
                            <LazyImage src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1">
                              <p className="font-bold text-sm tracking-tight">{user.displayName}</p>
                              {user.isVerified && <VerifiedBadge tier={user.premiumTier} className="w-[14px] h-[14px]" />}
                            </div>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleCircle(user)}
                          className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          title="Remover do círculo"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-[2rem] border border-black/5 shadow-inner">
                    <div className="w-20 h-20 bg-emerald-50 flex items-center justify-center rounded-full mx-auto mb-4">
                      <Sparkles className="w-10 h-10 text-emerald-500 opacity-20" />
                    </div>
                    <p className="font-bold text-black mb-1">Círculo Vazio</p>
                    <p className="text-sm text-gray-500 px-12">
                      Adicione pessoas usando a busca acima para compartilhar conteúdos exclusivos.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
