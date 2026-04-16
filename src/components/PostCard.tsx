import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, MoreHorizontal, Trash2, Edit2, Send, Zap as ZapIcon, MessageCircle, Repeat, Heart } from 'lucide-react';
import { formatRelativeTime } from '../lib/dateUtils';
import VerifiedBadge from './VerifiedBadge';
import PostContent from './PostContent';
import QuotedPost from './QuotedPost';
import Poll from './Poll';
import { useAuth } from '../contexts/AuthContext';

interface PostCardProps {
  key?: any;
  post: any;
  onLike: (post: any) => void;
  onRepost: (post: any) => void;
  onDelete: (postId: string) => void;
  onEdit: (post: any) => void;
  onShare: (post: any) => void;
  onReply: (post: any) => void;
  onQuote: (post: any) => void;
  onImageClick: (src: string, alt: string) => void;
  canEdit: (post: any) => boolean;
}

export default function PostCard({
  post,
  onLike,
  onRepost,
  onDelete,
  onEdit,
  onShare,
  onReply,
  onQuote,
  onImageClick,
  canEdit
}: PostCardProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => navigate(`/post/${post.id}`)}
      className="group relative p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer flex space-x-3"
    >
      {/* Avatar */}
      <div 
        className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0"
        onClick={(e) => {
          stopPropagation(e);
          navigate(`/${post.authorUsername}`);
        }}
      >
        {post.authorPhoto ? (
          <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
        ) : (
          <UserIcon className="w-full h-full p-2 text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-1 min-w-0 cursor-pointer"
            onClick={(e) => {
              stopPropagation(e);
              navigate(`/${post.authorUsername}`);
            }}
          >
            <span className="font-bold truncate hover:underline">{post.authorName}</span>
            {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge className="w-4 h-4 flex-shrink-0" tier={post.authorPremiumTier} />}
            <span className="text-gray-500 truncate">@{post.authorUsername}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-sm whitespace-nowrap">
              {post.createdAt?.toDate ? formatRelativeTime(post.createdAt.toDate()) : 'Agora'}
            </span>
            {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
          </div>

          <div className="relative">
            <button 
              onClick={(e) => {
                stopPropagation(e);
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-2 hover:bg-blue-50 hover:text-blue-500 rounded-full transition-colors text-gray-500"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20" onClick={stopPropagation}>
                {post.authorId === userProfile?.uid ? (
                  <>
                    <button 
                      onClick={() => {
                        onDelete(post.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Apagar post</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (canEdit(post)) {
                          onEdit(post);
                        }
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEdit(post) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar post</span>
                    </button>
                  </>
                ) : (
                  <button 
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Seguir @{post.authorUsername}</span>
                  </button>
                )}
                
                <button 
                   onClick={() => {
                     onShare(post);
                     setIsMenuOpen(false);
                   }}
                   className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                 >
                   <Send className="w-4 h-4" />
                   <span>Compartilhar</span>
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mt-1 text-[15px] leading-normal text-gray-900 break-words">
          <PostContent content={post.content} />
        </div>

        {/* Image */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div 
            className={`mt-3 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer grid gap-1 ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {post.imageUrls.map((url: string, index: number) => (
              <img 
                key={index} 
                src={url} 
                alt={`Post ${index}`} 
                className="w-full h-auto max-h-[512px] object-cover"
                referrerPolicy="no-referrer"
                onClick={(e) => {
                  stopPropagation(e);
                  onImageClick(url, 'Imagem do post');
                }}
              />
            ))}
          </div>
        )}

        {/* Quote Post */}
        {post.quotePostId && (
          <div className="mt-3">
            <QuotedPost post={post} />
          </div>
        )}

        {/* Poll */}
        {post.poll && (
          <div className="mt-3">
            <Poll 
              post={post} 
              handleFirestoreError={() => {}} 
              OperationType={{ UPDATE: 'update' }} 
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between max-w-md text-gray-500">
          <button 
            onClick={(e) => {
              stopPropagation(e);
              onReply(post);
            }}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs">{post.repliesCount || 0}</span>
          </button>

          <button 
            onClick={(e) => {
              stopPropagation(e);
              onRepost(post);
            }}
            className={`flex items-center space-x-2 group/action transition-colors ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
          >
            <div className="p-2 group-hover/action:bg-green-50 rounded-full transition-colors">
              <Repeat className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs">{post.repostsCount || 0}</span>
          </button>

          <button 
            onClick={(e) => {
              stopPropagation(e);
              onLike(post);
            }}
            className={`flex items-center space-x-2 group/action transition-colors ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
          >
            <div className="p-2 group-hover/action:bg-red-50 rounded-full transition-colors">
              <Heart className={`w-4.5 h-4.5 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
            </div>
            <span className="text-xs">{post.likesCount || 0}</span>
          </button>

          <button 
            onClick={(e) => {
              stopPropagation(e);
              onQuote(post);
            }}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <ZapIcon className="w-4.5 h-4.5" />
            </div>
          </button>

          <button 
            onClick={(e) => {
              stopPropagation(e);
              onShare(post);
            }}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <Send className="w-4.5 h-4.5" />
            </div>
          </button>
        </div>
      </div>
    </motion.article>
  );
}
