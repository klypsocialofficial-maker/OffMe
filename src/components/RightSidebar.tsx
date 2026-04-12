import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, MoreHorizontal, UserPlus } from 'lucide-react';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import { useNavigate } from 'react-router-dom';

export default function RightSidebar() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const trendingTopics = [
    { category: 'Tecnologia · Em alta', title: '#OffMe', posts: '12.5K posts' },
    { category: 'Brasil · Em alta', title: 'Ghost App', posts: '8,432 posts' },
    { category: 'Entretenimento · Em alta', title: 'Liquid Glass UI', posts: '5,102 posts' },
    { category: 'Esportes · Em alta', title: 'Futebol', posts: '45.2K posts' },
    { category: 'Música · Em alta', title: 'Novo Álbum', posts: '2,100 posts' },
  ];

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!db || !userProfile?.uid) return;
      try {
        const q = query(
          collection(db, 'users'),
          where('uid', '!=', userProfile.uid),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setSuggestions(users);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [userProfile?.uid]);

  return (
    <aside className="hidden lg:flex flex-col w-[350px] sticky top-0 h-screen py-4 px-6 space-y-4 overflow-y-auto">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 pb-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar no OffMe"
            className="block w-full pl-11 pr-4 py-3 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-black/5 focus:bg-white outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Premium Banner */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
        <h3 className="font-black text-xl">Assine o Premium</h3>
        <p className="text-sm font-medium leading-tight">Assine para desbloquear novos recursos e, se elegível, receba uma parte da receita dos anúncios.</p>
        <button 
          onClick={() => navigate('/premium')}
          className="bg-black text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors"
        >
          Inscrever-se
        </button>
      </div>

      {/* Trending Section */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        <h3 className="font-black text-xl px-4 py-3">O que está acontecendo</h3>
        <div className="divide-y divide-gray-100">
          {trendingTopics.map((topic, i) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors group relative">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">{topic.category}</span>
                <button className="p-1 hover:bg-black/5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <p className="font-bold text-sm mt-0.5">{topic.title}</p>
              <span className="text-xs text-gray-500">{topic.posts}</span>
            </div>
          ))}
        </div>
        <button className="w-full text-left px-4 py-4 text-blue-500 hover:bg-gray-100 transition-colors text-sm">
          Mostrar mais
        </button>
      </div>

      {/* Who to follow */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        <h3 className="font-black text-xl px-4 py-3">Quem seguir</h3>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Carregando sugestões...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((user) => (
              <div 
                key={user.uid} 
                className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group"
                onClick={() => navigate(`/profile/${user.uid}`)}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    <img src={user.photoURL || '/ghost.svg'} alt={user.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <p className="font-bold text-sm truncate group-hover:underline">{user.displayName}</p>
                      {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge className="w-3 h-3" tier={user.premiumTier} />}
                    </div>
                    <p className="text-gray-500 text-xs truncate">@{user.username}</p>
                  </div>
                </div>
                <button className="bg-black text-white px-4 py-1.5 rounded-full font-bold text-xs hover:bg-gray-800 transition-colors">
                  Seguir
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">Nenhuma sugestão no momento</div>
          )}
        </div>
        <button className="w-full text-left px-4 py-4 text-blue-500 hover:bg-gray-100 transition-colors text-sm">
          Mostrar mais
        </button>
      </div>

      {/* Footer Links */}
      <div className="px-4 py-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500">
        <a href="#" className="hover:underline">Termos de Serviço</a>
        <a href="#" className="hover:underline">Política de Privacidade</a>
        <a href="#" className="hover:underline">Política de Cookies</a>
        <a href="#" className="hover:underline">Acessibilidade</a>
        <a href="#" className="hover:underline">Informações de anúncios</a>
        <a href="#" className="hover:underline">Mais...</a>
        <span>© 2026 OffMe Corp.</span>
      </div>
    </aside>
  );
}
