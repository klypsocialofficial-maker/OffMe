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
