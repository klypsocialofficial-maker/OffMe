import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import VerifiedBadge from './VerifiedBadge';
import { getDefaultAvatar } from '../lib/avatar';

interface QuotedPostProps {
  post: any;
}

export default function QuotedPost({ post }: QuotedPostProps) {
  const navigate = useNavigate();
  const [quotedData, setQuotedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotedPost = async () => {
      if (!post.quotedPostId) return;
      try {
        const docRef = doc(db, 'posts', post.quotedPostId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuotedData({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching quoted post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotedPost();
  }, [post.quotedPostId]);

  if (loading && !quotedData) {
    return (
      <div className="mt-3 p-3 border border-gray-200 rounded-xl bg-gray-50 flex animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-200 mr-2" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 bg-gray-200 rounded w-1/4" />
          <div className="h-2 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Use fetched data if available, otherwise fallback to stored summary
  const displayAuthor = quotedData?.authorName || post.quotedPostAuthor;
  const displayContent = quotedData?.content || post.quotedPostContent;
  const displayUsername = quotedData?.authorUsername;
  const displayPhoto = quotedData?.authorPhoto;
  const displayVerified = quotedData?.authorVerified;
  const displayImages = quotedData?.imageUrls || [];

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/post/${post.quotedPostId}`);
      }}
      className="mt-3 p-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group"
    >
      <div className="flex items-center space-x-2 mb-2">
        <img 
          src={displayPhoto || getDefaultAvatar(displayAuthor, displayUsername)} 
          alt={displayAuthor}
          className="w-5 h-5 rounded-full object-cover"
        />
        <div className="flex items-center space-x-1 min-w-0">
          <span className="font-bold text-xs truncate">{displayAuthor}</span>
          {displayVerified && <VerifiedBadge />}
          {displayUsername && (
            <span className="text-xs text-gray-500 truncate">@{displayUsername}</span>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
          {displayContent}
        </p>
        
        {displayImages.length > 0 && (
          <div className="relative rounded-xl overflow-hidden aspect-video border border-gray-200/50 dark:border-white/5">
            <img 
              src={displayImages[0]} 
              alt="Quoted attachment" 
              className="w-full h-full object-cover"
            />
            {displayImages.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">
                +{displayImages.length - 1}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
