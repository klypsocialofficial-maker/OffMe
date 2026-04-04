import React, { useState, useEffect } from 'react';
import { Zap, ArrowLeft, CheckCircle, Star, Briefcase, Shield } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
        navigate('/profile', { replace: true });
      }, 5000);
    }
  }, [isSuccess, navigate]);

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
      <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex flex-col items-center justify-center text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
        <p className="text-gray-600 mb-8">Você agora é um membro Premium do OffMe.</p>
        <p className="text-sm text-gray-400">Redirecionando para o seu perfil...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))] overflow-y-auto pb-24">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Zap className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Planos Premium</h1>
      </div>

      {isCanceled && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
          O pagamento foi cancelado. Tente novamente quando estiver pronto.
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Plano Prata */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <Shield className="w-10 h-10 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold mb-1">Básico (Prata)</h2>
          <p className="text-gray-500 text-sm mb-6">O essencial para se destacar.</p>
          
          <div className="text-left space-y-3 mb-6 text-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-gray-700">Selo de verificação Prata</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-gray-700">Edição de posts até 1 hora</span>
            </div>
          </div>

          <div className="text-2xl font-black mb-4">
            R$ 9,90 <span className="text-xs font-normal text-gray-500">/ único</span>
          </div>

          <button 
            onClick={() => handleSubscribe('silver')}
            disabled={loadingTier !== null || userProfile?.premiumTier === 'silver'}
            className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-sm"
          >
            {loadingTier === 'silver' ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : userProfile?.premiumTier === 'silver' ? (
              'Seu Plano Atual'
            ) : (
              'Assinar Prata'
            )}
          </button>
        </div>

        {/* Plano Gold */}
        <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-yellow-400 relative overflow-hidden transform scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
            Mais Popular
          </div>
          <Star className="w-10 h-10 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold mb-1">OffMe Fun (Gold)</h2>
          <p className="text-gray-500 text-sm mb-6">A experiência completa do OffMe.</p>
          
          <div className="text-left space-y-3 mb-6 text-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-gray-700 font-medium">Selo de verificação Gold</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-gray-700">Edição de posts a qualquer momento</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-gray-700">Destaque nas respostas</span>
            </div>
          </div>

          <div className="text-2xl font-black mb-4">
            R$ 19,90 <span className="text-xs font-normal text-gray-500">/ único</span>
          </div>

          <button 
            onClick={() => handleSubscribe('gold')}
            disabled={loadingTier !== null || userProfile?.premiumTier === 'gold'}
            className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-2xl font-bold hover:bg-yellow-500 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-sm"
          >
            {loadingTier === 'gold' ? (
              <div className="w-5 h-5 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin" />
            ) : userProfile?.premiumTier === 'gold' ? (
              'Seu Plano Atual'
            ) : (
              'Assinar Gold'
            )}
          </button>
        </div>

        {/* Plano Black */}
        <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <Briefcase className="w-10 h-10 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold mb-1">OffMe Business (Black)</h2>
          <p className="text-gray-400 text-sm mb-6">Para criadores e marcas.</p>
          
          <div className="text-left space-y-3 mb-6 text-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300 font-medium">Selo de verificação Black</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">Todas as vantagens do Gold</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">Analytics e Insights (Em breve)</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">Suporte prioritário</span>
            </div>
          </div>

          <div className="text-2xl font-black mb-4">
            R$ 49,90 <span className="text-xs font-normal text-gray-400">/ único</span>
          </div>

          <button 
            onClick={() => handleSubscribe('black')}
            disabled={loadingTier !== null || userProfile?.premiumTier === 'black'}
            className="bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-sm"
          >
            {loadingTier === 'black' ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : userProfile?.premiumTier === 'black' ? (
              'Seu Plano Atual'
            ) : (
              'Assinar Business'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
