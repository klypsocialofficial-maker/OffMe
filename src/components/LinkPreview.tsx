import React, { useState, useEffect } from 'react';
import { ExternalLink, Play, Eye, ThumbsUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
  isVideo?: boolean;
  videoId?: string;
  views?: string;
  likes?: string;
  channelTitle?: string;
}

export default function LinkPreview({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { language } = useLanguage();

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/metadata?url=${encodeURIComponent(normalizedUrl)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMetadata(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [normalizedUrl]);

  const formatNumber = (numStr?: string) => {
    if (!numStr) return '';
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return numStr;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-40 bg-gray-50" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-gray-50 rounded w-3/4" />
          <div className="h-3 bg-gray-50 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !metadata || !metadata.title) return null;

  // Render YouTube Interactive Card
  if (metadata.isVideo && metadata.videoId) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 block rounded-2xl border border-red-100/40 overflow-hidden bg-white hover:bg-gray-50/50 transition-all shadow-sm hover:shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div 
              key="player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full aspect-video bg-black"
            >
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${metadata.videoId}?autoplay=1`}
                title={metadata.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                }}
                className="absolute top-2 right-2 bg-red-600/95 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg flex items-center justify-center transition-colors border border-red-500/20 cursor-pointer"
                title={language === 'pt' ? 'Fechar Vídeo' : language === 'es' ? 'Cerrar Vídeo' : 'Close Video'}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlaying(true)}
              className="relative w-full aspect-video bg-gray-950 overflow-hidden cursor-pointer group"
            >
              {metadata.image ? (
                <img 
                  src={metadata.image} 
                  alt={metadata.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <span className="text-[10px] text-gray-500">YouTube</span>
                </div>
              )}
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                <div className="w-16 h-11 bg-red-600 group-hover:bg-red-700 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all text-white">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                YouTube
              </span>
              {metadata.channelTitle && (
                <span className="text-xs font-bold text-gray-500 truncate max-w-[150px]">
                  {metadata.channelTitle}
                </span>
              )}
            </div>
            <a 
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Open in YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <h4 className="font-bold text-[15px] text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
            {metadata.title}
          </h4>

          {/* Statistics from YouTube API */}
          {(metadata.views || metadata.likes) && (
            <div className="flex items-center space-x-4 mt-2 text-xs font-medium text-gray-400">
              {metadata.views && (
                <div className="flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{formatNumber(metadata.views)} {language === 'pt' ? 'visualizações' : language === 'es' ? 'vistas' : 'views'}</span>
                </div>
              )}
              {metadata.likes && (
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{formatNumber(metadata.likes)}</span>
                </div>
              )}
            </div>
          )}

          {!metadata.views && !metadata.likes && metadata.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-normal">
              {metadata.description}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback to Standard Link Preview
  return (
    <motion.a 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      href={normalizedUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-3 block rounded-2xl border border-gray-100 overflow-hidden hover:bg-gray-50 transition-all group shadow-sm hover:shadow-md"
    >
      {metadata.image && (
        <div className="relative h-48 overflow-hidden bg-gray-50">
          <img 
            src={metadata.image} 
            alt={metadata.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center space-x-1.5 mb-1.5">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter truncate max-w-[200px]">
            {metadata.siteName || new URL(normalizedUrl).hostname}
          </span>
          <ExternalLink className="w-3 h-3 text-gray-300" />
        </div>
        <h4 className="font-bold text-[15px] text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {metadata.title}
        </h4>
        {metadata.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-normal">
            {metadata.description}
          </p>
        )}
      </div>
    </motion.a>
  );
}
