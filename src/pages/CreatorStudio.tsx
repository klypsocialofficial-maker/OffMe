import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Filter,
  Download,
  LayoutDashboard,
  Eye,
  Heart,
  Repeat,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';

const MOCK_GROWTH_DATA = [
  { name: 'Seg', followers: 400, points: 2400 },
  { name: 'Ter', followers: 300, points: 1398 },
  { name: 'Qua', followers: 200, points: 9800 },
  { name: 'Qui', followers: 278, points: 3908 },
  { name: 'Sex', followers: 189, points: 4800 },
  { name: 'Sáb', followers: 239, points: 3800 },
  { name: 'Dom', followers: 349, points: 4300 },
];

export default function CreatorStudio() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalEngagement: 0,
    followerGrowth: 0,
    pointsEarned: 0
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!userProfile?.uid) return;
      setLoading(true);
      
      try {
        // Fetch top posts by engagement (likes + reposts)
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', userProfile.uid),
          orderBy('likesCount', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopPosts(posts);

        // Aggregate stats
        const totalLikes = posts.reduce((acc, p: any) => acc + (p.likesCount || 0), 0);
        const totalReposts = posts.reduce((acc, p: any) => acc + (p.repostsCount || 0), 0);
        
        setStats({
          totalImpressions: totalLikes * 15, // Simplified mock
          totalEngagement: totalLikes + totalReposts,
          followerGrowth: 12, // Mock
          pointsEarned: userProfile.points || 0
        });
      } catch (error) {
        console.error("Error fetching studio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userProfile?.uid]);

  if (!userProfile?.isCreator) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter">Creator Studio</h1>
          <p className="text-gray-500 font-medium">Torne-se um criador para acessar analytics avançados, ferramentas de monetização e mais!</p>
          <button 
            onClick={() => navigate('/settings')}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
          >
            Ativar Modo Criador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F5F5F3] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-black/5 pt-[env(safe-area-inset-top)]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-black italic tracking-tighter">Studio</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 border border-black/5 rounded-xl bg-white hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 border border-black/5 rounded-xl bg-white hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Impressões', value: stats.totalImpressions, trend: '+12.5%', up: true, icon: Eye },
            { label: 'Engajamento', value: stats.totalEngagement, trend: '+3.2%', up: true, icon: Heart },
            { label: 'Seguidores', value: stats.followerGrowth, trend: '+0.5%', up: true, icon: Users },
            { label: 'Pontos Totais', value: stats.pointsEarned, trend: '-2.1%', up: false, icon: TrendingUp },
          ].map((item, i) => (
            <motion.div 
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-[2rem] border border-black/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-slate-50 rounded-2xl">
                  <item.icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className={`flex items-center space-x-1 text-[10px] font-black italic ${item.up ? 'text-green-500' : 'text-red-500'}`}>
                  {item.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{item.trend}</span>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
              <p className="text-2xl font-black italic tracking-tighter mt-1">{item.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Crescimento de Alcance</h3>
              <select className="bg-gray-50 text-[10px] font-black border-none rounded-xl px-3 py-1.5 focus:ring-0">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_GROWTH_DATA}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Area type="monotone" dataKey="points" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Engajamento Diário</h3>
              <div className="flex space-x-1">
                <button className="w-6 h-6 rounded-full bg-blue-500" />
                <button className="w-6 h-6 rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_GROWTH_DATA}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="followers" fill="#141414" radius={[10, 10, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Top Posts Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Posts de Melhor Performance</h3>
            <button className="text-[10px] font-black bg-slate-50 px-4 py-2 rounded-xl text-gray-500 hover:text-black transition-colors uppercase tracking-widest">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Conteúdo</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Likes</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Reposts</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {topPosts.length > 0 ? topPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {post.imageUrls?.[0] ? (
                            <LazyImage src={post.imageUrls[0]} className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center lowercase font-mono text-[10px] text-gray-400 p-2">
                              {post.content?.substring(0, 20)}...
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <p className="text-sm font-bold truncate lowercase">{post.content}</p>
                          <p className="text-[10px] text-gray-400 font-mono italic">
                            {post.createdAt?.toDate?.().toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1 text-sm font-black italic">
                        <Heart className="w-3 h-3 text-red-500 fill-current" />
                        <span>{post.likesCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1 text-sm font-black italic">
                        <Repeat className="w-3 h-3 text-green-500" />
                        <span>{post.repostsCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest">Viral</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-400 text-sm italic font-medium">Nenhum dado disponível ainda</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
