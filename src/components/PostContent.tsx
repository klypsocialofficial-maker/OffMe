import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PostContentProps {
  content: string;
  className?: string;
}

export default function PostContent({ content, className = '' }: PostContentProps) {
  const navigate = useNavigate();

  if (!content) return null;
  
  // Split by mentions (@username) OR hashtags (#hashtag)
  const parts = content.split(/(@\w+|#\w+)/g);
  
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
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
        
        return part;
      })}
    </p>
  );
}
