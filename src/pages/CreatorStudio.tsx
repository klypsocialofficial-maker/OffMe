import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, TrendingUp, DollarSign, Users, Award, ShieldCheck, ChevronRight, Activity } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function CreatorStudio() {
  const { userProfile, enableCreatorMode } = useAuth();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tech');
  const [totalEngagement, setTotalEngagement] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);

  const categories = [
    'Tech', 'Gaming', 'Arte', 'Música', 'Educação', 'Cripto', 'Lifestyle', 'Comédia', 'Notícias', 'Esportes'
  ];

  useEffect(() => {
    async function fetchStats() {
      if (!userProfile?.uid || !db) return;
      try {
        const q = query(collection(db, 'posts'), where('authorId', '==', userProfile.uid));
        const snapshot = await getDocs(q);
        let engagement = 0;
        setTotalPosts(snapshot.size);

        snapshot.forEach(doc => {
          const data = doc.data();
          engagement += (data.likesCount || 0);
          engagement += (data.repliesCount || 0);
          engagement += (data.repostsCount || 0);
        });

        setTotalEngagement(engagement);
      } catch(err) {
        console.error("Error fetching creator stats", err);
      }
    }
    
    if (userProfile?.isCreator) {
      fetchStats();
    }
  }, [userProfile]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await enableCreatorMode(selectedCategory);
      // Wait a moment for firestore to sync mostly
      setTimeout(() => setIsJoining(false), 800);
    } catch (err) {
      console.error(err);
      setIsJoining(false);
    }
  };

  if (!userProfile?.isCreator) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center">
        <div className="w-full bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20 flex items-center shadow-sm">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Estúdio de Criação</h1>
        </div>

        <div className="max-w-xl w-full p-6 pt-12 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-6 rotate-3"
          >
            <Star className="w-12 h-12 text-white fill-current" />
          </motion.div>

          <h2 className="text-3xl font-black text-center mb-4">Ganhe com o que você ama criar</h2>
          <p className="text-gray-500 text-center text-lg mb-10 leading-relaxed">
            Faça parte do programa oficial de criadores. Receba gorjetas dos seus fãs, desbloqueie conteúdo exclusivo para inscritos e tenha acesso a métricas aprofundadas.
          </p>

          <div className="w-full space-y-4 mb-10">
            <div className="flex items-start space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Monetização Direta</h3>
                <p className="text-sm text-gray-500 mt-1">Ative gorjetas no seu perfil e permita que as pessoas te paguem por DM ou em posts virais.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Métricas Detalhadas</h3>
                <p className="text-sm text-gray-500 mt-1">Saiba exatamente de onde estão vindo os seus acessos, taxa de engajamento e retenção do público.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Comunidade Premium</h3>
                <p className="text-sm text-gray-500 mt-1">Crie um Círculo exclusivo e interaja de forma mais próxima com assinantes que te apoiam.</p>
              </div>
            </div>
          </div>

          <div className="w-full bg-white p-5 text-left rounded-3xl border border-gray-200 shadow-sm mb-8">
            <label className="block font-bold text-gray-800 mb-2">Qual seu nicho principal?</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat 
                      ? 'bg-black text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xl py-4 rounded-full shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center"
          >
            {isJoining ? 'Ativando Conta...' : 'Me tornar Criador'}
          </button>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Ao se tornar um criador, você concorda com nossos Termos de Monetização.
          </p>
        </div>
      </div>
    );
  }

  // Creator Dashboard State
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          Meu Estúdio
          <VerifiedBadge tier="gold" className="w-5 h-5" />
        </h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-6 pb-20">
        
        {/* Welcome Block */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Star className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <span className="bg-white/20 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border border-white/10 backdrop-blur-sm">Nível Criador: {userProfile.level || 1}</span>
              <h2 className="text-2xl font-bold mt-3">Bem-vindo(a) de volta, {userProfile.displayName}!</h2>
              <p className="text-indigo-200 mt-1">Nicho principal: <span className="font-bold text-white">{userProfile.creatorCategory || 'Geral'}</span></p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <h3 className="font-bold text-gray-900 text-lg px-1">Visão Geral (Últimos 28 dias)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 font-medium">Ganhos (Tips)</span>
              <div className="p-2 bg-green-50 text-green-600 rounded-full">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{userProfile.points || 0} pts</div>
            <div className="text-xs text-transparent flex items-center mt-1 font-medium">
              Gorjetas recebidas e acumuladas
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 font-medium">Seguidores</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{userProfile.followers?.length || 0} fãs</div>
            <div className="text-xs text-transparent flex items-center mt-1 font-medium">
               Base de usuários inscrita
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 col-span-2">
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 font-medium">Engajamento Global (Comentários, Curtidas e Reposts)</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{totalEngagement} interações</div>
            <div className="text-xs text-gray-400 mt-2">Através de seus {totalPosts} posts na plataforma</div>
          </div>
        </div>

        {/* Creator Tools */}
        <h3 className="font-bold text-gray-900 text-lg px-1 mt-6">Ferramentas</h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Programa de Verificação</p>
                <p className="text-xs text-gray-500">Aumente sua credibilidade com o selo dourado</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Configurar Recompensas</p>
                <p className="text-xs text-gray-500">Defina o que apoiadores recebem por doar</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

      </div>
    </div>
  );
}
