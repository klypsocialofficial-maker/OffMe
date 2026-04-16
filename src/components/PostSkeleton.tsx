import React from 'react';

export default function PostSkeleton() {
  return (
    <div className="p-4 liquid-glass-card rounded-2xl shadow-sm overflow-hidden mb-4">
      <div className="flex space-x-3">
        {/* Avatar Skeleton */}
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 shimmer text-gray-200" />
        
        <div className="flex-1 space-y-3 py-1">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-gray-200 rounded w-24 shimmer text-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-16 shimmer text-gray-200" />
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full shimmer text-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-5/6 shimmer text-gray-200" />
          </div>
          
          {/* Actions Skeleton */}
          <div className="flex justify-between max-w-md pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-8 bg-gray-100 rounded-full shimmer text-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
