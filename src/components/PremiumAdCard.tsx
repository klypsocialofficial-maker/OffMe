import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Crown, Zap, Briefcase, ChevronRight, Star } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

export default function PremiumAdCard() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);

  const plans = [
    {
      id: 'silver',
      name: 'PRATA',
      color: 'from-slate-300 to-slate-500',
      icon: Star,
      perks: ['Selo Prata', 'Sem Anúncios', 'Posts Premium'],
    },
    {
      id: 'gold',
      name: 'OURO',
      color: 'from-amber-400 to-yellow-600',
      icon: Crown,
      perks: ['Selo Ouro', 'Círculo Exclusivo', 'Temas Custom'],
      popular: true,
    },
    {
      id: 'black',
      name: 'BLACK',
      color: 'from-zinc-800 to-black',
      icon: Briefcase,
      perks: ['Selo Business', 'Analytics Pro', 'Alcance Global'],
    }
  ];

  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setActiveIndex(index);
  };

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-4 bg-white border-b border-black/5 flex flex-col relative overflow-hidden"
    >
      {/* AD Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-black text-gray-400 border border-gray-200">AD</span>
      </div>

      <div className="flex flex-row space-x-3">
        {/* Logo / Official Icon */}
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0 cursor-pointer shadow-lg shadow-black/10">
          <img src="/logo.svg" alt="OffMe" className="w-6 h-6 invert" />
        </div>

        <div className="flex-1 min-w-0 px-2">
          <div className="flex items-center space-x-1 mb-1">
            <span className="font-black italic tracking-tighter text-sm">OffMe</span>
            <VerifiedBadge className="w-4 h-4" tier="black" />
            <span className="text-gray-400 text-xs font-bold">@OffMe</span>
          </div>

          <p className="text-[14px] font-medium text-gray-800 mb-4 leading-relaxed">
            ✨ Eleve sua experiência! Torne-se um membro **Elite** do OffMe e desbloqueie o verdadeiro potencial da sua voz digital.
          </p>

          {/* Carousel Wrapper */}
          <div className="relative group mb-2">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-none"
            >
              {plans.map((plan, idx) => (
                <motion.div 
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  className={`min-w-[260px] h-[160px] snap-center bg-gradient-to-br ${plan.color} p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-xl shadow-black/5`}
                >
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.1 }}
                    className="absolute top-0 right-0 p-4"
                  >
                    <plan.icon size={80} />
                  </motion.div>
                  
                  <div>
                    <div className="flex items-center space-x-2 text-white">
                      <plan.icon size={14} className="animate-pulse" />
                      <span className="font-black italic tracking-tighter text-[10px] uppercase opacity-70">Plano Oficial</span>
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter text-white mt-0.5 uppercase tracking-tight">{plan.name}</h3>
                  </div>

                  <div className="space-y-1">
                    {plan.perks.map((perk, i) => (
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex items-center text-white/90 text-[10px] font-bold"
                      >
                        <Sparkles size={10} className="mr-1.5 text-amber-300" />
                        {perk}
                      </motion.div>
                    ))}
                  </div>

                  {plan.popular && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[8px] font-black text-white uppercase tracking-widest">
                      Mais Popular
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Action Slide */}
              <motion.div 
                onClick={() => navigate('/premium')}
                whileTap={{ scale: 0.95 }}
                className="min-w-[200px] h-[160px] snap-center bg-black p-5 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-900 transition-all border border-white/10 group/btn shadow-xl"
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover/btn:bg-white/20 transition-colors">
                  <Zap className="text-amber-400 fill-amber-400" size={24} />
                </div>
                <h4 className="text-white font-black italic tracking-tighter text-sm mb-1 uppercase">SEJA PREMIUM</h4>
                <div className="flex items-center space-x-1 text-amber-400 animate-bounce-horizontal">
                  <span className="text-[10px] font-black uppercase tracking-widest">Ver Planos</span>
                  <ChevronRight size={12} />
                </div>
              </motion.div>
            </div>

            {/* Scroll Indicator Dots */}
            <div className="flex justify-center space-x-1.5 mt-2">
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    activeIndex === i ? 'bg-black w-3' : 'bg-gray-200'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
