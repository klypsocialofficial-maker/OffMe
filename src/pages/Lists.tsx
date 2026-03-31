import React from 'react';
import { List, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Lists() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <List className="w-6 h-6" />
        <h1 className="text-xl font-bold">Listas</h1>
      </div>
      <div className="p-8 text-center text-gray-500">
        Você ainda não criou ou seguiu nenhuma lista.
      </div>
    </div>
  );
}
