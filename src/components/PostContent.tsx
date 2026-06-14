import React from 'react';
import { useNavigate } from 'react-router-dom';
import LinkPreview from './LinkPreview';
import { motion } from 'motion/react';

interface PostContentProps {
  content: string;
  className?: string;
  showPreview?: boolean;
}

export default function PostContent({ content, className = '', showPreview = true }: PostContentProps) {
  const navigate = useNavigate();

  if (!content) return null;
  
  // URL detection regex - handles http, https and www
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  // Extract URLs and clean them (remove trailing punctuation)
  const rawUrls = content.match(urlRegex) || [];
  const urls = rawUrls.map(url => url.replace(/[.,!?;:)]+$/, ''));
  
  // Split by mentions (@username) OR hashtags (#hashtag) OR URLs
  // We use a more complex split to ensure we match the cleaned URLs precisely
  const parts = content.split(/(@\w+|#\w+|https?:\/\/[^\s]+|www\.[^\s]+)/gi);
  
  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            const username = part.substring(1);
            return (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/${username}`);
                }}
                className="text-sky-500 hover:text-sky-600 hover:underline cursor-pointer font-semibold transition-colors duration-200"
              >
                {part}
              </span>
            );
          }
          
          if (part.startsWith('#')) {
            const tag = part.substring(1);
            const isWorldCupTag = [
              'copa2026', 'copadomundo', 'hexa2026', 
              'brasilnacopa', 'copa26', 'worldcup2026', 
              'worldcup26', 'rumoaohexa', 'hexa'
            ].includes(tag.toLowerCase());

            if (isWorldCupTag) {
              return (
                <motion.span
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/explore?q=${encodeURIComponent(part)}`);
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 my-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-blue-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/10 cursor-pointer overflow-hidden relative select-none border border-emerald-400/20"
                  whileHover={{ 
                    scale: 1.1,
                    rotate: [-1, 1, -1, 0],
                    boxShadow: "0px 10px 15px rgba(16, 185, 129, 0.4)"
                  }}
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    backgroundPosition: {
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    },
                    scale: { duration: 0.15 }
                  }}
                  style={{
                    backgroundSize: '200% auto'
                  }}
                >
                  {/* Glowing Shimmer */}
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{
                      repeat: Infinity,
                      repeatDelay: 2.5,
                      duration: 1.5,
                      ease: "easeInOut"
                    }}
                  />
                  <span>{part}</span>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "linear"
                    }}
                    className="inline-block"
                  >
                    ⚽
                  </motion.span>
                </motion.span>
              );
            }

            return (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore?q=${encodeURIComponent(part)}`);
                }}
                className="text-sky-500 hover:text-sky-600 hover:underline cursor-pointer font-semibold transition-colors duration-200"
              >
                {part}
              </span>
            );
          }

          if (part.match(urlRegex)) {
            const cleanPart = part.replace(/[.,!?;:)]+$/, '');
            const trailingPunc = part.substring(cleanPart.length);
            const href = cleanPart.startsWith('http') ? cleanPart : `https://${cleanPart}`;
            return (
              <React.Fragment key={index}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-500 hover:underline break-all"
                >
                  {cleanPart}
                </a>
                {trailingPunc}
              </React.Fragment>
            );
          }
          
          return part;
        })}
      </p>

      {showPreview && urls && urls.length > 0 && (
        <LinkPreview url={urls[0]} />
      )}
    </div>
  );
}
