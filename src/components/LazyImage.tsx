import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
  [key: string]: any;
}

// Helper to optimize common image URLs to use WebP for faster cell performance.
function optimizeImageUrl(url?: string): string {
  if (!url) return '';
  try {
    // If it's already a DataURL or already webp, leave it
    if (url.startsWith('data:') || url.includes('.webp') || url.includes('format=webp')) {
      return url;
    }

    const parsed = new URL(url);
    
    // Picsum photos optimization: Picsum supports .webp extension
    // e.g. https://picsum.photos/800/400 -> https://picsum.photos/800/400.webp
    if (parsed.hostname.includes('picsum.photos')) {
      if (!parsed.pathname.endsWith('.webp')) {
        const search = parsed.search ? parsed.search : '';
        return `https://${parsed.hostname}${parsed.pathname}.webp${search}`;
      }
    }
    
    // Unsplash optimization: append fm=webp
    if (parsed.hostname.includes('unsplash.com')) {
      parsed.searchParams.set('fm', 'webp');
      return parsed.toString();
    }
  } catch (e) {
    // Fallback to original URL if parsing fails
  }
  return url;
}

export default function LazyImage({ src, alt, className, aspectRatio, ...props }: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimize URL to WebP format if applicable
  const optimizedSrc = src ? optimizeImageUrl(src) : '';

  useEffect(() => {
    // Use IntersectionObserver to lazy load images, running only when visible
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '120px 0px', // start loading 120px before image enters viewport (extremely smooth mobile experience!)
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]); // Re-observe if src changes

  const containerStyle = aspectRatio ? { aspectRatio } : {};

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 min-h-[40px] ${className}`} 
      style={containerStyle}
    >
      {/* Progressive Blur / Skeleton Shimmer Placeholder */}
      <AnimatePresence>
        {!isLoaded && !error && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-100/80"
            style={{ zIndex: 1 }}
          >
            <div className="w-full h-full shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render the actual images progressively once in view */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            isLoaded 
              ? 'opacity-100 blur-0 scale-100' 
              : 'opacity-0 blur-md scale-105'
          }`}
          style={{ transitionProperty: 'opacity, filter, transform' }}
          {...props}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-mono">
          Erro ao carregar imagem
        </div>
      )}
    </div>
  );
}
