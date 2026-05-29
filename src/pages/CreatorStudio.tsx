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
  ArrowLeft,
  Gift
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

export default function CreatorStudio() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalEngagement: 0,
    followerGrowth: 0,
    pointsEarned: 0,
    totalGifts: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [activeWeeklyMetric, setActiveWeeklyMetric] = useState<'views' | 'engagement' | 'postsCount' | 'gifts'>('views');

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!userProfile?.uid) return;
      setLoading(true);
      
      try {
        // Fetch all gifts
        const giftsQuery = query(
          collection(db, 'gifts'),
          where('receiverId', '==', userProfile.uid)
        );
        const giftsSnap = await getDocs(giftsQuery);
        const allGifts = giftsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const giftCount = allGifts.length;

        // Fetch all user posts to aggregate data
        const allPostsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', userProfile.uid),
          orderBy('createdAt', 'desc')
        );
        const allPostsSnap = await getDocs(allPostsQuery);
        const allPosts = allPostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Top posts for display
        const top = [...allPosts]
          .sort((a: any, b: any) => ((b.likesCount || 0) + (b.repostsCount || 0)) - ((a.likesCount || 0) + (a.repostsCount || 0)))
          .slice(0, 5);
        setTopPosts(top);

        // Aggregate stats
        let impressions = 0;
        let engagement = 0;
        
        // Prepare chart data (last 7 days)
        const last7Days: any[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          last7Days.push({ 
            name: dayName.charAt(0).toUpperCase() + dayName.slice(1), 
            date: d.toDateString(),
            followers: 0, // We don't have historical follower data, so we'll use post count or engagement as proxy
            engagement: 0,
            views: 0
          });
        }

        const getPostDate = (p: any): Date | null => {
          if (!p.createdAt) return null;
          if (p.createdAt instanceof Date) return p.createdAt;
          if (p.createdAt.toDate) return p.createdAt.toDate();
          if (typeof p.createdAt.seconds === 'number') return new Date(p.createdAt.seconds * 1000);
          return new Date(p.createdAt);
        };

        const getGiftDate = (g: any): Date | null => {
          if (!g.createdAt) return null;
          if (g.createdAt instanceof Date) return g.createdAt;
          if (g.createdAt.toDate) return g.createdAt.toDate();
          if (typeof g.createdAt.seconds === 'number') return new Date(g.createdAt.seconds * 1000);
          return new Date(g.createdAt);
        };

        // Prepare historical weekly data (last 4 weeks, chronologically ordered)
        const weeksList: any[] = [];
        for (let i = 3; i >= 0; i--) {
          const startDate = new Date();
          startDate.setDate(now.getDate() - (i + 1) * 7);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date();
          endDate.setDate(now.getDate() - i * 7);
          endDate.setHours(23, 59, 59, 999);
          
          const startLabel = startDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
          const endLabel = endDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
          
          weeksList.push({
            id: `week-${i}`,
            index: i,
            label: i === 0 ? 'Esta Semana' : i === 1 ? 'Semana Passada' : `Há ${i} semanas`,
            range: `${startLabel} - ${endLabel}`,
            startDate,
            endDate,
            views: 0,
            likes: 0,
            reposts: 0,
            replies: 0,
            engagement: 0,
            gifts: 0,
            postsCount: 0
          });
        }

        allPosts.forEach((p: any) => {
          impressions += (p.viewCount || 0);
          engagement += (p.likesCount || 0) + (p.repostsCount || 0) + (p.repliesCount || 0);

          const postDate = getPostDate(p);
          if (postDate) {
            const dayIndex = last7Days.findIndex(day => day.date === postDate.toDateString());
            if (dayIndex !== -1) {
              last7Days[dayIndex].engagement += (p.likesCount || 0) + (p.repostsCount || 0);
              last7Days[dayIndex].views += (p.viewCount || 0);
            }

            weeksList.forEach((week) => {
              if (postDate >= week.startDate && postDate <= week.endDate) {
                week.views += (p.viewCount || 0);
                week.likes += (p.likesCount || 0);
                week.reposts += (p.repostsCount || 0);
                week.replies += (p.repliesCount || 0);
                week.engagement += (p.likesCount || 0) + (p.repostsCount || 0) + (p.repliesCount || 0);
                week.postsCount += 1;
              }
            });
          }
        });

        allGifts.forEach((g: any) => {
          const giftDate = getGiftDate(g);
          if (giftDate) {
            weeksList.forEach((week) => {
              if (giftDate >= week.startDate && giftDate <= week.endDate) {
                week.gifts += 1;
              }
            });
          }
        });

        setStats({
          totalImpressions: impressions,
          totalEngagement: engagement,
          followerGrowth: userProfile.followers?.length || 0,
          pointsEarned: userProfile.points || 0,
          totalGifts: giftCount
        });

        // Map to chart format
        const finalChartData = last7Days.map(day => ({
          name: day.name,
          views: day.views,
          engagement: day.engagement
        }));
        setChartData(finalChartData);
        setWeeklyData(weeksList);

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

  const getGrowthRate = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%';
    }
    const rate = ((current - previous) / previous) * 100;
    return (rate >= 0 ? '+' : '') + rate.toFixed(1) + '%';
  };

  const getWeeklyMetricInfo = (metric: string) => {
    switch(metric) {
      case 'views':
        return { label: 'Visualizações', color: '#3B82F6', icon: Eye };
      case 'engagement':
        return { label: 'Engajamento', color: '#10B981', icon: Heart };
      case 'postsCount':
        return { label: 'Novos Posts', color: '#8B5CF6', icon: BarChart3 };
      case 'gifts':
        return { label: 'Mimos Recebidos', color: '#F59E0B', icon: Gift };
      default:
        return { label: 'Visualizações', color: '#3B82F6', icon: Eye };
    }
  };

  const generateInsights = () => {
    if (weeklyData.length === 0) return [];
    
    const current = weeklyData[3] || { views: 0, engagement: 0, postsCount: 0, gifts: 0 };
    const prev = weeklyData[2] || { views: 0, engagement: 0, postsCount: 0, gifts: 0 };
    
    const insights = [];
    
    if (current.postsCount > prev.postsCount) {
      insights.push({
        title: "Consistência em Ritmo Forte",
        desc: `Você publicou ${current.postsCount} posts esta semana, superando a semana passada. Isso ajuda o algoritmo de recomendação a entregar mais seus posts!`,
        isPositive: true
      });
    } else if (current.postsCount < prev.postsCount && current.postsCount > 0) {
      insights.push({
        title: "Alerta de Consistência",
        desc: "Você reduziu o ritmo de publicações esta semana em relação à passada. Tente manter uma média diária ou interagir mais no feed para cobrir o alcance.",
        isPositive: false
      });
    } else if (current.postsCount === 0) {
      insights.push({
        title: "Sua Audiência Sente Sua Falta",
        desc: "Nenhum post registrado nesta semana até o momento. Lembre-se, criadores ativos têm 3x mais chance de viralizar na aba Explorar!",
        isPositive: false
      });
    }
    
    const currentRate = current.views > 0 ? (current.engagement / current.views) * 100 : 0;
    if (currentRate > 15) {
      insights.push({
        title: "Engajamento Altíssimo",
        desc: `Seu engajamento em relação às impressões está em impressionantes ${currentRate.toFixed(1)}%. Seus seguidores gostam muito de opinar e dar like!`,
        isPositive: true
      });
    } else {
      insights.push({
        title: "Dica de Engajamento",
        desc: "Que tal criar posts com enquetes ou perguntas abertas? Posts com tom de conversa conseguem até 45% mais comentários no Offme.",
        isPositive: true
      });
    }
    
    if (current.gifts > prev.gifts) {
      insights.push({
        title: "Curva de Monetização Crescente",
        desc: "Excelente! Você está recebendo mais gorjetas/mimos esta semana do que na passada. Continue interagindo para reter seus super-fãs.",
        isPositive: true
      });
    } else if (current.gifts > 0) {
      insights.push({
        title: "Fidelize com Agradecimentos",
        desc: "Você sabia que responder DMs que acompanham mimos ou criar posts agradecendo mimos recebidos incentiva os fãs a doarem mais vezes?",
        isPositive: true
      });
    }
    
    return insights;
  };

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
        {/* Navigation Tabs */}
        <div className="flex bg-neutral-200/50 p-1 rounded-2xl w-full sm:w-80">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === 'daily' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Geral (7D)
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === 'weekly' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            Análise Semanal
          </button>
        </div>

        {activeTab === 'daily' ? (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Impressões', value: stats.totalImpressions, trend: '+12.5%', up: true, icon: Eye },
                { label: 'Engajamento', value: stats.totalEngagement, trend: '+3.2%', up: true, icon: Heart },
                { label: 'Mimos', value: stats.totalGifts, trend: '+5.1%', up: true, icon: Gift },
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
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Area type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
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
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="engagement" fill="#141414" radius={[10, 10, 0, 0]} barSize={24} />
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
          </>
        ) : (
          <div className="space-y-6">
            {/* Weekly Comparison Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Visualizações', 
                  value: weeklyData[3]?.views || 0, 
                  prevValue: weeklyData[2]?.views || 0,
                  metric: 'views',
                  icon: Eye,
                  color: 'text-blue-500 bg-blue-50'
                },
                { 
                  label: 'Engajamento', 
                  value: weeklyData[3]?.engagement || 0, 
                  prevValue: weeklyData[2]?.engagement || 0,
                  metric: 'engagement',
                  icon: Heart,
                  color: 'text-emerald-500 bg-emerald-50'
                },
                { 
                  label: 'Publicações', 
                  value: weeklyData[3]?.postsCount || 0, 
                  prevValue: weeklyData[2]?.postsCount || 0,
                  metric: 'postsCount',
                  icon: BarChart3,
                  color: 'text-purple-500 bg-purple-50'
                },
                { 
                  label: 'Mimos', 
                  value: weeklyData[3]?.gifts || 0, 
                  prevValue: weeklyData[2]?.gifts || 0,
                  metric: 'gifts',
                  icon: Gift,
                  color: 'text-amber-500 bg-amber-50'
                },
              ].map((item, i) => {
                const growthStr = getGrowthRate(item.value, item.prevValue);
                const isUp = !growthStr.startsWith('-');
                const isZero = growthStr === '0%';
                
                return (
                  <motion.div 
                    key={item.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setActiveWeeklyMetric(item.metric as any)}
                    className={`p-5 rounded-[2rem] border cursor-pointer transition-all ${
                      activeWeeklyMetric === item.metric 
                        ? 'bg-white border-black ring-2 ring-black/5 shadow-md' 
                        : 'bg-white border-black/5 hover:border-black/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-2xl ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className={`flex items-center space-x-0.5 text-[10px] font-black italic ${
                        isZero ? 'text-gray-400' : isUp ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {isZero ? null : isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{growthStr}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                    <p className="text-2xl font-black italic tracking-tighter mt-1">{item.value.toLocaleString()}</p>
                    <p className="text-[9px] font-mono text-gray-400 mt-1">vs {item.prevValue} na anterior</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Main Interactive Chart Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Area Chart */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Tendência de Crescimento</h3>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      Visualizando: <span className="text-black font-black italic uppercase text-[11px]">{getWeeklyMetricInfo(activeWeeklyMetric).label}</span>
                    </p>
                  </div>
                  
                  {/* Metric Select Buttons */}
                  <div className="flex bg-slate-100 p-1 rounded-xl space-x-1">
                    {[
                      { key: 'views', label: 'Alcance' },
                      { key: 'engagement', label: 'Engaj.' },
                      { key: 'postsCount', label: 'Posts' },
                      { key: 'gifts', label: 'Mimos' },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setActiveWeeklyMetric(btn.key as any)}
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${
                          activeWeeklyMetric === btn.key 
                            ? 'bg-white text-black shadow-sm' 
                            : 'text-gray-400 hover:text-black'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="colorWeeklyMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getWeeklyMetricInfo(activeWeeklyMetric).color} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={getWeeklyMetricInfo(activeWeeklyMetric).color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const info = getWeeklyMetricInfo(activeWeeklyMetric);
                            return (
                              <div className="bg-white p-4 rounded-3xl shadow-xl border border-black/5 min-w-[160px]">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">{data.label}</p>
                                <p className="text-[9px] text-gray-400 font-mono mb-2">{data.range}</p>
                                <div className="flex items-center space-x-2">
                                  <info.icon className="w-4 h-4" style={{ color: info.color }} />
                                  <div>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{info.label}</p>
                                    <p className="text-base font-black italic text-gray-900">{payload[0].value.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-black/5 grid grid-cols-2 gap-2 text-[9px] font-bold text-gray-400">
                                  <div>Posts: {data.postsCount}</div>
                                  <div>Mimos: {data.gifts}</div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={activeWeeklyMetric} 
                        stroke={getWeeklyMetricInfo(activeWeeklyMetric).color} 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorWeeklyMetric)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Actionable Insights Board */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col h-full"
              >
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Recomendações Inteligentes</h3>
                
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[280px] pr-1">
                  {generateInsights().length > 0 ? generateInsights().map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-3xl border ${
                        insight.isPositive 
                          ? 'bg-emerald-50/50 border-emerald-100/40 text-emerald-950' 
                          : 'bg-amber-50/50 border-amber-100/40 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-black italic tracking-tight text-xs">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{insight.title}</span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed mt-1 text-gray-600">
                        {insight.desc}
                      </p>
                    </div>
                  )) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-gray-400 text-xs italic">
                      Gere engajamento e publique posts para destravar recomendações personalizadas.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Historical Table breakdown */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Histórico de Performance Semanal</h3>
                <span className="px-3 py-1 bg-black text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Estável</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-black/5">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Semana</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Período</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Volume de Posts</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Likes & Reposts</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Visualizações Totais</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Eficiência de Post (Engaj/Post)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {weeklyData.slice().reverse().map((week) => {
                      const efficiency = week.postsCount > 0 ? (week.engagement / week.postsCount).toFixed(1) : '0';
                      return (
                        <tr key={week.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-black italic tracking-tight text-gray-900">{week.label}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs text-gray-400 font-mono">{week.range}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-gray-700">{week.postsCount}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-black italic text-gray-800">{week.engagement}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-black italic text-gray-800">{week.views}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-black rounded-lg">
                              ⚡ {efficiency}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
