import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
}

export default function LinkPreview({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
