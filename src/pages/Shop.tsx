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
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';
import Toast from '../components/Toast';

const SHOP_CATEGORIES = [
  { id: 'all', name: 'Todos' },
  { id: 'badges', name: 'Emblemas' },
  { id: 'themes', name: 'Temas' },
  { id: 'boosts', name: 'Boosts' }
];

const SHOP_ITEMS = [
  { 
    id: 'badge_early_adopter', 
    name: 'Early Adopter', 
    category: 'badges', 
    price: 1000, 
    description: 'Mostre que você esteve aqui desde o início.',
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
  { 
    id: 'badge_flame', 
    name: 'Fogo nos Posts', 
    category: 'badges', 
    price: 2500, 
    description: 'Para quem nunca deixa a conversa esfriar.',
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-50'
  },
  { 
    id: 'badge_verified_plus', 
    name: 'Verificado Plus', 
    category: 'badges', 
    price: 50000, 
    description: 'Um selo de ouro exclusivo para os maiores criadores.',
    icon: ShieldCheck,
    color: 'text-blue-500',
    bg: 'bg-blue-50'
  },
  { 
    id: 'boost_reach', 
    name: 'Impulso de Alcance', 
    category: 'boosts', 
    price: 500, 
    description: 'Multiplica o alcance do seu próximo post por 2x.',
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-50'
  },
  { 
    id: 'theme_dark_gold', 
    name: 'Tema Dark Gold', 
    category: 'themes', 
    price: 10000, 
    description: 'Um visual luxuoso para o seu perfil.',
    icon: Sparkles,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50'
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
    <div className="w-full min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <ShoppingBag className="w-6 h-6 text-black" />
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter">OffMe Store</h1>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-full flex items-center space-x-2 border border-white/10 backdrop-blur-md">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-black italic text-sm">{totalPoints.toLocaleString()}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 pb-4 flex space-x-2 overflow-x-auto no-scrollbar">
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeCategory === cat.id 
                ? 'bg-white text-black' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-12">
        {/* Featured Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-64 sm:h-96 rounded-[3rem] overflow-hidden group cursor-pointer"
        >
          <LazyImage src="https://picsum.photos/seed/luxury/1200/600?blur=2" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 sm:p-12 flex flex-col justify-end">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Item Lendário</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-4">Founder Edition</h2>
            <p className="text-gray-400 max-w-md font-medium text-sm sm:text-base">Acesso vitalício a todos os temas premium e selo de fundador eterno na sua conta.</p>
            <div className="mt-6 flex space-x-4">
              <button className="px-8 py-3 bg-white text-black rounded-2xl font-black italic tracking-tight hover:scale-105 active:scale-95 transition-all">Ver Detalhes</button>
              <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl flex items-center space-x-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-black italic">Apenas via OffMe+</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const Icon = item.icon;
              const hasItem = userProfile?.inventory?.includes(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 flex flex-col hover:bg-white/[0.08] transition-all group"
                >
                  <div className={`w-16 h-16 ${item.bg} rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-500`}>
                    <Icon className={`w-8 h-8 ${item.color}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black italic tracking-tight">{item.name}</h3>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.category}</span>
                    </div>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="font-black italic">{item.price.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={hasItem || buyingId === item.id}
                      className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center space-x-2 ${
                        hasItem 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-white text-black hover:bg-gray-200'
                      }`}
                    >
                      {buyingId === item.id ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : hasItem ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Adquirido</span>
                        </>
                      ) : (
                        <span>Comprar</span>
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
