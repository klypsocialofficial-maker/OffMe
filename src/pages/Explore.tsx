import React from 'react';
import { Search } from 'lucide-react';

export default function Explore() {
  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar no OffMe" 
            className="w-full bg-black/5 rounded-full py-2 pl-10 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>
      <div className="p-8 text-center text-gray-500">
        <p className="text-xl font-bold mb-2">Descubra novos conteúdos</p>
        <p>As tendências e buscas aparecerão aqui.</p>
      </div>
    </div>
  );
}
