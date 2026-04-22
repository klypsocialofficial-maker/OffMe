import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, Search } from 'lucide-react';

export default function MusicCharts() {
  const [activeTab, setActiveTab] = useState<'global' | 'brazil'>('global');

  // IDs oficiais das playlists Spotify Top 50
  const playlistId = activeTab === 'global' 
    ? '37i9dQZEVXbMDoHDwVN2tF' // Top 50 Global
    : '37i9dQZEVXbMOk1Z01JpTf'; // Top 50 Brasil

  return (
    <div className="px-4 pb-8 flex flex-col">
      <div className="relative mb-6 rounded-[2rem] overflow-hidden bg-zinc-950 text-white p-6 shadow-xl flex-shrink-0">
        <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-green-500 via-emerald-700 to-teal-900 mix-blend-overlay" />
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <Headphones className="w-24 h-24 rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full mb-4 border border-white/10">
             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-green-50">Dados em Tempo Real</span>
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter mb-1">Spotify Oficial</h2>
          <p className="text-white/80 text-sm font-medium">Os hits mais ouvidos do momento.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6 border border-black/5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Procurando algo específico?</h4>
            <p className="text-xs text-gray-500">Use a barra de busca acima para encontrar faixas e artistas.</p>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 flex-shrink-0">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'global' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top 50 Global
        </button>
        <button
          onClick={() => setActiveTab('brazil')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'brazil' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top 50 Brasil
        </button>
      </div>

      <motion.div 
        key={playlistId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 w-full rounded-2xl overflow-hidden min-h-[550px] shadow-sm border border-black/5"
      >
        <iframe 
          style={{ borderRadius: '16px' }} 
          src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allowFullScreen={false} 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
          className="min-h-[550px]"
        />
      </motion.div>
    </div>
  );
}