import React from 'react';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Bookmarks() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Bookmark className="w-6 h-6" />
          <h1 className="text-xl font-black tracking-tight">Itens salvos</h1>
        </div>
      </div>
      <div className="p-8 text-center text-gray-500">
        Você ainda não salvou nenhum post.
      </div>
    </div>
  );
}
