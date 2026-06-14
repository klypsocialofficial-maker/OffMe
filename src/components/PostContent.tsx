import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
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
              'copa', 'copa2026', 'copadomundo', 'hexa2026', 
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
                  className="inline-flex items-center space-x-1 px-3 py-1 my-0.5 rounded-full bg-slate-950 text-amber-400 font-black text-[10px] uppercase tracking-widest cursor-pointer overflow-hidden relative border border-amber-500/30 shadow-[0_4px_10px_rgba(251,191,36,0.15)] group"
                  whileHover={{ scale: 1.05 }}
                  animate={{
                    borderColor: ["rgba(251, 191, 36, 0.3)", "rgba(251, 191, 36, 0.8)", "rgba(251, 191, 36, 0.3)"]
                  }}
                  transition={{
                    borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent w-full"
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{
                      repeat: Infinity,
                      repeatDelay: 3,
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  />
                  <span>{part}</span>
                  <Trophy className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform" />
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
