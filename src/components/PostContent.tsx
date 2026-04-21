import React from 'react';
import { useNavigate } from 'react-router-dom';
import LinkPreview from './LinkPreview';

interface PostContentProps {
  content: string;
  className?: string;
  showPreview?: boolean;
}

export default function PostContent({ content, className = '', showPreview = true }: PostContentProps) {
  const navigate = useNavigate();

  if (!content) return null;
  
  // URL detection regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex);
  
  // Split by mentions (@username) OR hashtags (#hashtag) OR URLs
  const parts = content.split(/(@\w+|#\w+|https?:\/\/[^\s]+)/g);
  
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
                className="text-blue-500 hover:underline cursor-pointer font-medium"
              >
                {part}
              </span>
            );
          }
          
          if (part.startsWith('#')) {
            const tag = part.substring(1);
            return (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/explore?q=${encodeURIComponent(part)}`);
                }}
                className="text-indigo-500 hover:underline cursor-pointer font-medium"
              >
                {part}
              </span>
            );
          }

          if (part.match(urlRegex)) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 hover:underline break-all"
              >
                {part}
              </a>
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
