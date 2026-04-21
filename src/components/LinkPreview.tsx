import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
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
  }, [url]);

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-pulse">
        <div className="h-40 bg-gray-100 dark:bg-white/5" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !metadata) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-3 block rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
    >
      {metadata.image && (
        <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-white/5">
          <img 
            src={metadata.image} 
            alt={metadata.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center space-x-1.5 mb-1">
          <span className="text-[10px] font-black uppercase text-gray-400 truncate max-w-[200px]">
            {metadata.siteName || new URL(url).hostname}
          </span>
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </div>
        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
          {metadata.title}
        </h4>
        {metadata.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
}
