import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

interface QuotedPostProps {
  post: any;
}

export default function QuotedPost({ post }: QuotedPostProps) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/post/${post.quotedPostId}`);
      }}
      className="mt-3 p-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <div className="flex items-center space-x-1 mb-1">
        <span className="font-bold text-sm">{post.quotedPostAuthor}</span>
      </div>
      <p className="text-sm text-gray-600 truncate">{post.quotedPostContent}</p>
    </div>
  );
}
