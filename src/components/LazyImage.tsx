import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
  [key: string]: any;
}

export default function LazyImage({ src, alt, className, aspectRatio, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // If no aspectRatio is provided and it's a grid-like image, 
  // we might want a default min-height to avoid 0-height shimmer
  const containerStyle = aspectRatio ? { aspectRatio } : {};

  return (
    <div 
      className={`relative overflow-hidden bg-gray-100 min-h-[40px] ${className}`} 
      style={containerStyle}
    >
      <AnimatePresence>
        {!isLoaded && !error && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-100"
          >
            <div className="w-full h-full shimmer" />
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        {...props}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
          Erro ao carregar imagem
        </div>
      )}
    </div>
  );
}
