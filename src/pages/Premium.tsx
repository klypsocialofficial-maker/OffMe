import React from 'react';
import { Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Premium() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Zap className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Premium</h1>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
        <h2 className="text-xl font-bold mb-2">Assine o Premium</h2>
        <p className="text-gray-500 mb-6">Desbloqueie recursos exclusivos, como edição de posts a qualquer momento, selo de verificação e muito mais!</p>
        <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors w-full sm:w-auto">
          Assinar agora
        </button>
      </div>
    </div>
  );
}
