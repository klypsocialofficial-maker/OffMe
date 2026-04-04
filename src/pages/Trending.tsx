import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrendingPosts from '../components/TrendingPosts';

export default function Trending() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-white">
      <div className="sticky top-0 bg-white/80 backdrop-blur-3xl z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100 flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Em Alta</h1>
      </div>
      
      <div className="py-6">
        <TrendingPosts isFullList={true} />
      </div>
    </div>
  );
}
