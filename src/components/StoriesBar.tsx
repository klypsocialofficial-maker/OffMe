import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';

interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  mediaUrl: string;
  type: 'image' | 'video';
}

interface StoriesBarProps {
  stories: Story[];
  userProfile: any;
  onOpenStory: (story: Story) => void;
  onCreateStory: () => void;
}

export default function StoriesBar({ stories, userProfile, onOpenStory, onCreateStory }: StoriesBarProps) {
  return (
    <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide">
      {/* Criar novo Story */}
      <div className="flex flex-col items-center space-y-1 flex-shrink-0" onClick={onCreateStory}>
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer">
          <Plus className="w-6 h-6 text-gray-400" />
        </div>
        <span className="text-xs text-gray-500 font-medium">Seu Story</span>
      </div>

      {/* Stories de outros */}
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center space-y-1 flex-shrink-0" onClick={() => onOpenStory(story)}>
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#FF3B30] p-0.5 cursor-pointer">
            <LazyImage src={story.authorPhoto || getDefaultAvatar(story.authorName, '')} alt={story.authorName} className="w-full h-full rounded-full" />
          </div>
          <span className="text-xs text-gray-700 font-medium truncate w-16 text-center">{story.authorName}</span>
        </div>
      ))}
    </div>
  );
}
