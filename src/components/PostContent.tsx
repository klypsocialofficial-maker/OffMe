import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PostContentProps {
  content: string;
  className?: string;
}

export default function PostContent({ content, className = '' }: PostContentProps) {
  const navigate = useNavigate();

  if (!content) return null;

  // Split by mentions (@username)
  const parts = content.split(/(@\w+)/g);

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
        return part;
      })}
    </p>
  );
}
