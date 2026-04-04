import React, { useState, useEffect } from 'react';
import { Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Premium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (isSuccess) {
      // We could trigger a confetti animation or just show a success message
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 5000);
    }
  }, [isSuccess, navigate]);

  const handleSubscribe = async () => {
    if (!userProfile?.uid) {
      setError('Você precisa estar logado para assinar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userProfile.uid }),
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
      setLoading(false);
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
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Zap className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Premium</h1>
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

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        
        <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Assine o Premium</h2>
        <p className="text-gray-500 mb-8">Desbloqueie recursos exclusivos e destaque-se na comunidade!</p>
        
        <div className="text-left space-y-4 mb-8">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-700">Edição de posts a qualquer momento</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-700">Selo de verificação exclusivo no perfil</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-700">Apoie o desenvolvimento do OffMe</span>
          </div>
        </div>

        <div className="text-3xl font-black mb-6">
          R$ 19,90 <span className="text-base font-normal text-gray-500">/ único</span>
        </div>

        <button 
          onClick={handleSubscribe}
          disabled={loading || userProfile?.isPremium}
          className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : userProfile?.isPremium ? (
            'Você já é Premium'
          ) : (
            'Assinar agora'
          )}
        </button>
      </div>
    </div>
  );
}
