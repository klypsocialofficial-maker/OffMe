import React, { useState, useEffect } from 'react';
import { Zap as ZapIcon, ArrowLeft, CheckCircle, Star, Briefcase, Shield, Sparkles, Crown, Trophy, Target, Heart, Rocket } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from '../components/VerifiedBadge';

export default function Premium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        navigate(`/${userProfile?.username || 'profile'}`, { replace: true });
      }, 5000);
    }
  }, [isSuccess, navigate, userProfile?.username]);

  const handleSubscribe = async (tier: string) => {
    if (!userProfile?.uid) {
      setError('Você precisa estar logado para assinar.');
      return;
    }

    setLoadingTier(tier);
    setError('');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userProfile.uid, tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar o checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoadingTier(null);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-white opacity-50" />
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative z-10 w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20 mb-8"
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black italic tracking-tighter mb-4 z-10"
        >
          SEJA BEM-VINDO!
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600 max-w-xs mb-8 z-10 font-medium"
        >
          Você agora faz parte da elite do OffMe. Seus benefícios já foram ativados em seu perfil.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center space-x-2 text-sm text-gray-400 z-10"
        >
          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
          <span>Redirecionando...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-y-auto pb-32">
      {/* Immersive Header */}
      <div className="relative pt-[env(safe-area-inset-top)] overflow-hidden">
        <div className="absolute inset-0 bg-black z-0" />
        <div className="absolute inset-0 opacity-40 mix-blend-overlay z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-3xl animate-pulse" />
        </div>
        
        <div className="relative z-10 px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Elite Club</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl font-black italic tracking-tighter text-white mb-4 leading-none">
              ELEVE SUA<br />EXPERIÊNCIA
            </h1>
            <p className="text-white/60 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">
              Destaque-se na comunidade e desbloqueie ferramentas exclusivas de criação e privacidade.
            </p>
          </motion.div>
        </div>

        {/* Decorative Wave */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-slate-50 whitespace-nowrap overflow-hidden" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}></div>
      </div>

      <div className="px-4 -mt-6 relative z-20 space-y-8">
        {(isCanceled || error) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-4 rounded-3xl border-2 border-red-100 flex items-center space-x-3 shadow-xl"
          >
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-red-500">Atenção</p>
              <p className="text-sm text-gray-700 font-medium">{error || 'Pagamento cancelado.'}</p>
            </div>
          </motion.div>
        )}

        {/* Plans Container */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Silver Plan */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-slate-500/10 transition-all duration-700" />
            
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                <Shield className="w-7 h-7 text-slate-400" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-black italic tracking-tighter">R$ 9,90</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pagamento Único</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2">OffMe Prata</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Ideal para quem quer um toque de distinção e navegar com tranquilidade.</p>

            <ul className="space-y-4 mb-8">
              {[
                { label: 'Selo Verificado Prata', icon: VerifiedBadge, props: { tier: 'silver', className: 'w-4 h-4' } },
                { label: 'Sem Anúncios', icon: ZapIcon },
                { label: 'Edição de posts (1h)', icon: Sparkles },
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    {item.icon === VerifiedBadge ? <VerifiedBadge {...(item.props || {})} /> : <item.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{item.label}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('silver')}
              disabled={loadingTier !== null || userProfile?.premiumTier === 'silver'}
              className="w-full py-4 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              {loadingTier === 'silver' ? '...' : userProfile?.premiumTier === 'silver' ? 'PLANO ATUAL' : 'OBTER PRATA'}
            </button>
          </motion.div>

          {/* Gold Plan - Most Popular */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-yellow-400 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-widest shadow-sm">
              Mais Brilhante
            </div>
            
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center border border-yellow-100 shadow-inner">
                <Crown className="w-7 h-7 text-yellow-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-black italic tracking-tighter">R$ 19,90</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pagamento Único</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2">OffMe Fun Gold</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">A experiência definitiva para criadores e usuários engajados da comunidade.</p>

            <ul className="space-y-4 mb-8">
              {[
                { label: 'Selo Verificado Gold', icon: VerifiedBadge, props: { tier: 'gold', className: 'w-4 h-4' } },
                { label: 'Posts & Comentários no Topo', icon: Trophy },
                { label: 'Edição de Posts Ilimitada', icon: Sparkles },
                { label: 'Cores Exclusivas de Perfil', icon: Heart },
                { label: 'Prioridade em Suporte', icon: Target },
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500">
                    {item.icon === VerifiedBadge ? <VerifiedBadge {...(item.props || {})} /> : <item.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{item.label}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('gold')}
              disabled={loadingTier !== null || userProfile?.premiumTier === 'gold'}
              className="w-full py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200 hover:bg-yellow-500 hover:shadow-yellow-300 disabled:opacity-50"
            >
              {loadingTier === 'gold' ? '...' : userProfile?.premiumTier === 'gold' ? 'PLANO ATUAL' : 'BRILHAR COM GOLD'}
            </button>
          </motion.div>

          {/* Black Plan */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gray-900 p-8 rounded-[40px] shadow-sm border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-[0.03] rounded-full -mr-24 -mt-24 blur-3xl group-hover:opacity-10 transition-all duration-1000" />
            
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-black italic tracking-tighter text-white">R$ 49,90</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pagamento Único</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2 text-white">OffMe Business</h3>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">Para quem usa o OffMe como plataforma de negócios ou marca pessoal.</p>

            <ul className="space-y-4 mb-8">
              {[
                { label: 'Selo Verificado Black', icon: VerifiedBadge, props: { tier: 'black', className: 'w-4 h-4' } },
                { label: 'Analytics Pro (Em breve)', icon: Briefcase },
                { label: 'Link de Perfil Customizado', icon: Rocket },
                { label: 'Todas as Vantagens Gold', icon: Sparkles },
                { label: 'Selos de Badge Exclusivos', icon: Trophy },
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                    {item.icon === VerifiedBadge ? <VerifiedBadge {...(item.props || {})} /> : <item.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-bold text-white/70">{item.label}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('black')}
              disabled={loadingTier !== null || userProfile?.premiumTier === 'black'}
              className="w-full py-4 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all bg-white text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              {loadingTier === 'black' ? '...' : userProfile?.premiumTier === 'black' ? 'PLANO ATUAL' : 'DOMINAR COM BLACK'}
            </button>
          </motion.div>

        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-4 py-8">
          {[
            { icon: ZapIcon, label: 'Turbo Feed', desc: 'Sua voz alcança mais pessoas' },
            { icon: Shield, label: 'Safe Zone', desc: 'Navegação purificada' },
            { icon: Heart, label: 'Custom UI', desc: 'Deixe o app com sua cara' },
            { icon: Sparkles, iconColor: 'text-purple-500', label: 'Drafts+', desc: 'Salve posts ilimitados' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className={`w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 ${feature.iconColor || 'text-indigo-500'}`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-tighter mb-1">{feature.label}</h4>
              <p className="text-[10px] text-gray-500 font-medium leading-tight">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Closing Trust Segment */}
        <div className="text-center pb-8">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Plataforma Segura</p>
          <div className="flex justify-center items-center space-x-6 opacity-30">
            <div className="h-4 w-12 bg-gray-400 rounded-full" />
            <div className="h-4 w-16 bg-gray-400 rounded-full" />
            <div className="h-4 w-10 bg-gray-400 rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
}
