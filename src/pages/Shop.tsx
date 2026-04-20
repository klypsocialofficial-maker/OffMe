import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Star, 
  Zap, 
  ShieldCheck, 
  Trophy, 
  ArrowLeft,
  Coins,
  Sparkles,
  CheckCircle2,
  Lock,
  Flame,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';
import Toast from '../components/Toast';

const SHOP_CATEGORIES = [
  { id: 'all', name: 'Todos' },
  { id: 'badges', name: 'Emblemas' },
  { id: 'frames', name: 'Molduras' },
  { id: 'themes', name: 'Temas' },
  { id: 'boosts', name: 'Boosts' },
  { id: 'mystery', name: 'Mistério' }
];

const SHOP_ITEMS = [
  // BADGES
  { 
    id: 'badge_early_adopter', 
    name: 'Early Adopter', 
    category: 'badges', 
    price: 1500, 
    description: 'Mostre que você esteve aqui desde o início da jornada OffMe.',
    icon: Star,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10'
  },
  { 
    id: 'badge_flame', 
    name: 'Fogo nos Posts', 
    category: 'badges', 
    price: 3500, 
    description: 'Para quem nunca deixa a conversa esfriar e agita o feed.',
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10'
  },
  { 
    id: 'badge_verified_plus', 
    name: 'Verificado Plus', 
    category: 'badges', 
    price: 100000, 
    description: 'Um selo de ouro exclusivo para os criadores de maior elite.',
    icon: ShieldCheck,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10'
  },
  { 
    id: 'badge_diamond', 
    name: 'Diamante Bruto', 
    category: 'badges', 
    price: 250000, 
    description: 'Raridade máxima. Apenas para os verdadeiros OGs.',
    icon: Trophy,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  
  // FRAMES (New)
  { 
    id: 'frame_neon_blue', 
    name: 'Aura Neon', 
    category: 'frames', 
    price: 8000, 
    description: 'Uma moldura pulsante azul para sua foto de perfil.',
    icon: Sparkles,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  { 
    id: 'frame_gold_leaf', 
    name: 'Folha de Ouro', 
    category: 'frames', 
    price: 15000, 
    description: 'Elegância máxima com detalhes em ouro 24k.',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10'
  },

  // BOOSTS
  { 
    id: 'boost_reach_x2', 
    name: 'Impulso Foguete', 
    category: 'boosts', 
    price: 1200, 
    description: 'Multiplica o alcance do seu próximo post por 2x.',
    icon: Zap,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10'
  },
  { 
    id: 'boost_xp_x2', 
    name: 'XP em Dobro', 
    category: 'boosts', 
    price: 3000, 
    description: 'Ganhe o dobro de XP em todas as missões por 24h.',
    icon: Trophy,
    color: 'text-green-400',
    bg: 'bg-green-400/10'
  },

  // THEMES
  { 
    id: 'theme_cyberpunk', 
    name: 'Cyberpunk 2077', 
    category: 'themes', 
    price: 20000, 
    description: 'Cores vibrantes e visual futurista para seu app.',
    icon: Sparkles,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  { 
    id: 'theme_dark_gold', 
    name: 'Luxo Real', 
    category: 'themes', 
    price: 25000, 
    description: 'Um visual luxuoso e sóbrio com toques de ouro.',
    icon: Sparkles,
    color: 'text-yellow-600',
    bg: 'bg-yellow-600/10'
  },

  // MYSTERY
  { 
    id: 'mystery_box_small', 
    name: 'Caixa Surpresa', 
    category: 'mystery', 
    price: 5000, 
    description: 'Pode conter um emblema raro ou um boost aleatório.',
    icon: ShoppingBag,
    color: 'text-white',
    bg: 'bg-white/10'
  }
];

export default function Shop() {
  const navigate = useNavigate();
  const { userProfile, purchaseItem } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(userProfile?.points || 0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'success',
    isOpen: false
  });

  const filteredItems = SHOP_ITEMS.filter(item => 
    activeCategory === 'all' || item.category === activeCategory
  );

  const handlePurchase = async (item: typeof SHOP_ITEMS[0]) => {
    if (!userProfile) return;
    if (userProfile.inventory?.includes(item.id)) {
      setToast({ message: 'Você já possui este item!', type: 'error', isOpen: true });
      return;
    }
    
    setBuyingId(item.id);
    try {
      await purchaseItem(item.id, item.price);
      setToast({ message: `Sucesso! Você adquiriu ${item.name}`, type: 'success', isOpen: true });
      setTotalPoints(p => p - item.price);
    } catch (err: any) {
      setToast({ message: err.message || 'Erro ao processar compra', type: 'error', isOpen: true });
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-3xl border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">OffMe Store</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Venda seu tédio aqui</p>
            </div>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-yellow-400/20 to-amber-600/20 px-3 sm:px-4 py-2 rounded-2xl flex items-center space-x-2 border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)] backdrop-blur-md"
          >
            <Coins className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="font-black italic text-sm sm:text-base text-yellow-50">{totalPoints.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* Categories */}
        <div className="px-4 sm:px-6 pb-4 flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                activeCategory === cat.id 
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'bg-white/5 text-gray-500 hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-12">
        {/* Featured Hero (Bento Large) */}
        {activeCategory === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-[28rem] sm:h-[32rem] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden group cursor-pointer border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 animate-pulse-slow" />
            <LazyImage src="https://picsum.photos/seed/future/1200/800?blur=1" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000 ease-out" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 sm:p-16 flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 mb-3"
              >
                <div className="px-3 py-1 bg-yellow-500 rounded-full flex items-center space-x-1.5 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  <Star className="w-3 h-3 text-black fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-black">Edição Limitada</span>
                </div>
              </motion.div>
              <h2 className="text-5xl sm:text-8xl font-black italic tracking-tighter mb-4 leading-[0.9]">CRYSTAL<br />FOUNDER</h2>
              <p className="text-gray-300 max-w-md font-medium text-sm sm:text-lg mb-8 leading-relaxed">Mostre que você construiu a fundação desta comunidade. Inclui badge animada e tema exclusivo.</p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button className="px-10 py-4 bg-white text-black rounded-2xl font-black italic tracking-tight hover:bg-gray-100 active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center justify-center space-x-2 group/btn">
                   <span>Adquirir Edição</span>
                </button>
                <div className="px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center space-x-3 border border-white/10">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-black italic uppercase tracking-widest text-gray-400">Só no OffMe+</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Items Grid (Bento) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pb-32">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const Icon = item.icon;
              const hasItem = userProfile?.inventory?.includes(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                  whileHover={{ y: -5 }}
                  className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-7 flex flex-col group relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="absolute top-0 right-0 p-12 -mr-16 -mt-16 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                  
                  <div className={`w-20 h-20 ${item.bg} rounded-[2rem] flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl`}>
                    <Icon className={`w-10 h-10 ${item.color} drop-shadow-lg`} />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-black italic tracking-tight text-white group-hover:text-yellow-50 transition-colors">{item.name}</h3>
                      <div className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.category}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">{item.description}</p>
                  </div>

                  <div className="mt-auto pt-7 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preço</span>
                      <div className="flex items-center space-x-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="text-xl font-black italic tracking-tighter text-yellow-50">{item.price.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={hasItem || buyingId === item.id}
                      className={`h-14 px-6 rounded-2xl font-black italic tracking-tight transition-all active:scale-95 flex items-center space-x-3 overflow-hidden group/btn ${
                        hasItem 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-white text-black hover:bg-yellow-50 shadow-lg shadow-white/5'
                      }`}
                    >
                      {buyingId === item.id ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : hasItem ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Adquirido</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">Comprar</span>
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type === 'success' ? 'success' : 'error'} 
        isOpen={toast.isOpen} 
        onClose={() => setToast(p => ({ ...p, isOpen: false }))} 
      />
    </div>
  );
}
