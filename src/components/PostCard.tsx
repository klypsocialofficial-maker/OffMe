import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, MoreHorizontal, Trash2, Edit2, Send, MessageCircle, Repeat, Heart, Ghost, VolumeX, UserX, ShieldAlert, Bookmark, BookmarkCheck, Pin, PinOff, Users, BarChart2, Gift } from 'lucide-react';
import { formatRelativeTime } from '../lib/dateUtils';
import VerifiedBadge from './VerifiedBadge';
import PostContent from './PostContent';
import QuotedPost from './QuotedPost';
import Poll from './Poll';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultAvatar } from '../lib/avatar';
import ReportModal from './ReportModal';
import ConfirmModal from './ConfirmModal';
import TipModal from './TipModal';

import PostImageGrid from './PostImageGrid';
import LazyImage from './LazyImage';

interface PostCardProps {
  key?: any;
  post: any;
  isProfilePinned?: boolean;
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
  isProfilePinned,
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
  const { userProfile, muteUser, unmuteUser, blockUser, unblockUser, bookmarkPost, unbookmarkPost, pinPost, unpinPost } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const repostTimerRef = React.useRef<any>(null);

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

  const handleRepostPointerDown = (e: React.PointerEvent) => {
    stopPropagation(e);
    repostTimerRef.current = setTimeout(() => {
      onQuote(effectivePost);
      repostTimerRef.current = 'QUOTED';
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handleRepostPointerUp = (e: React.PointerEvent) => {
    stopPropagation(e);
    if (repostTimerRef.current === 'QUOTED') {
      repostTimerRef.current = null;
      return;
    }
    
    if (repostTimerRef.current) {
      clearTimeout(repostTimerRef.current);
      repostTimerRef.current = null;
      onRepost(effectivePost);
    }
  };

  const handleRepostPointerCancel = () => {
    if (repostTimerRef.current && repostTimerRef.current !== 'QUOTED') {
      clearTimeout(repostTimerRef.current);
    }
    repostTimerRef.current = null;
  };

  const handleShare = async (e: React.MouseEvent) => {
    stopPropagation(e);
    setIsMenuOpen(false);
    
    // Check if Web Share API is available
    if (navigator.share) {
      const shareData = {
        title: `Post de ${post.authorName} no Offme`,
        text: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        url: `${window.location.origin}/post/${post.id}`
      };

      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        // If aborted by user, don't do anything
        if ((error as Error).name === 'AbortError') return;
        console.error('Erro ao compartilhar nativamente:', error);
      }
    }
    
    // Fallback to existing share modal
    onShare(post);
  };

  const effectivePost = post.type === 'repost' ? { ...post, id: post.repostedPostId } : post;

  const handleBookmark = async (e: React.MouseEvent) => {
    stopPropagation(e);
    if (!userProfile?.uid) return;
    
    try {
      if (userProfile.bookmarks?.includes(effectivePost.id)) {
        await unbookmarkPost(effectivePost.id);
      } else {
        await bookmarkPost(effectivePost.id);
      }
    } catch (error) {
      console.error('Erro ao favoritar post:', error);
    }
  };

  const isPinned = isProfilePinned === true;

  const handlePin = async (e: React.MouseEvent) => {
    stopPropagation(e);
    if (!userProfile?.uid) return;
    try {
      if (userProfile?.pinnedPostIds?.includes(effectivePost.id)) {
        await unpinPost(effectivePost.id);
      } else {
        await pinPost(effectivePost.id);
      }
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Erro ao fixar post:', error);
    }
  };

  // Don't show posts from blocked users
  const authorId = post.type === 'repost' ? post.originalPostAuthorId : post.authorId;
  if (userProfile?.blockedUsers?.includes(authorId)) {
    return null;
  }

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => navigate(`/post/${effectivePost.id}`)}
      className="group relative p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer flex flex-col"
    >
      {/* Repost Header */}
      {post.type === 'repost' && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <Repeat className="w-3.5 h-3.5" />
          <span>{post.authorId === userProfile?.uid ? 'Você' : post.authorName} repostou</span>
        </div>
      )}

      {/* Pin Header */}
      {isPinned && !post.type && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <Pin className="w-3.5 h-3.5 fill-current" />
          <span>Fixado</span>
        </div>
      )}

      {/* Circle Header */}
      {post.privacy === 'circle' && (
        <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold mb-2 ml-10">
          <div className="bg-emerald-100 p-1 rounded-full">
            <Users className="w-3 h-3" />
          </div>
          <span>Meu Círculo</span>
        </div>
      )}

      <div className="flex space-x-3">
        {/* Avatar */}
        <div 
          className={`w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 ${post.authorId !== 'anonymous' ? 'cursor-pointer' : ''} ${post.authorId === 'anonymous' ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : ''}`}
          onClick={(e) => {
            const authorId = post.type === 'repost' ? post.originalPostAuthorId : post.authorId;
            const authorUsername = post.type === 'repost' ? post.originalPostAuthorUsername : post.authorUsername;
            
            if (authorId === 'anonymous') return;
            stopPropagation(e);
            navigate(`/${authorUsername}`);
          }}
        >
          {post.authorId === 'anonymous' ? (
            <Ghost className="w-5 h-5 text-indigo-400" />
          ) : post.type === 'repost' ? (
            post.originalPostAuthorPhoto ? (
              <LazyImage src={post.originalPostAuthorPhoto} alt={post.originalPostAuthorName} className="w-full h-full" />
            ) : (
              <LazyImage src={getDefaultAvatar(post.originalPostAuthorName, post.originalPostAuthorUsername)} alt={post.originalPostAuthorName} className="w-full h-full" />
            )
          ) : post.authorPhoto ? (
            <LazyImage src={post.authorPhoto} alt={post.authorName} className="w-full h-full" />
          ) : (
            <LazyImage src={getDefaultAvatar(post.authorName, post.authorUsername)} alt={post.authorName} className="w-full h-full" />
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div 
              className={`flex items-center space-x-1 min-w-0 ${post.authorId !== 'anonymous' ? 'cursor-pointer' : ''}`}
              onClick={(e) => {
                const authorId = post.type === 'repost' ? post.originalPostAuthorId : post.authorId;
                const authorUsername = post.type === 'repost' ? post.originalPostAuthorUsername : post.authorUsername;
                
                if (authorId === 'anonymous') return;
                stopPropagation(e);
                navigate(`/${authorUsername}`);
              }}
            >
              <span className={`font-bold truncate ${post.authorId !== 'anonymous' ? 'hover:underline' : ''} ${post.authorId === 'anonymous' ? 'text-indigo-600 italic' : ''}`}>
                {post.type === 'repost' ? post.originalPostAuthorName : post.authorName}
              </span>
              {post.authorId !== 'anonymous' && (( (post.type === 'repost' ? post.originalPostAuthorVerified : post.authorVerified) || 
                 (post.type === 'repost' ? post.originalPostAuthorUsername : post.authorUsername) === 'Rulio') && (
                <VerifiedBadge className="w-4 h-4 flex-shrink-0" tier={post.type === 'repost' ? post.originalPostAuthorPremiumTier : post.authorPremiumTier} />
              ))}
              <span className="text-gray-500 truncate">@{post.type === 'repost' ? post.originalPostAuthorUsername : post.authorUsername}</span>
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
                {(post.authorId === userProfile?.uid || post.ownerId === userProfile?.uid) ? (
                  <>
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteModalOpen(true);
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

                    <button 
                      onClick={handlePin}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {userProfile?.pinnedPostIds?.includes(effectivePost.id) ? (
                        <>
                          <PinOff className="w-4 h-4" />
                          <span>Desafixar do perfil</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4" />
                          <span>Fixar no perfil</span>
                        </>
                      )}
                    </button>
                  </>
                ) : post.authorId !== 'anonymous' ? (
                  <>
                    <button 
                      onClick={handleBookmark}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {userProfile.bookmarks?.includes(effectivePost.id) ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-blue-500" />
                          <span>Remover dos salvos</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Salvar post</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={async () => {
                        try {
                          await navigate(`/${post.authorUsername}`);
                        } finally {
                          setIsMenuOpen(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Ver perfil @{post.authorUsername}</span>
                    </button>

                    <button 
                      onClick={async () => {
                        try {
                          if (userProfile?.mutedUsers?.includes(post.authorId)) {
                            await unmuteUser(post.authorId);
                          } else {
                            await muteUser(post.authorId);
                          }
                        } finally {
                          setIsMenuOpen(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <VolumeX className="w-4 h-4" />
                      <span>{userProfile?.mutedUsers?.includes(post.authorId) ? 'Desmutar' : 'Mutar'} @{post.authorUsername}</span>
                    </button>

                    <button 
                      onClick={async () => {
                        try {
                          await blockUser(post.authorId);
                        } finally {
                          setIsMenuOpen(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Bloquear @{post.authorUsername}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsReportModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Denunciar post</span>
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-2 text-xs text-gray-400 italic">Post anônimo</div>
                )}
                
                <button 
                   onClick={handleShare}
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

        {/* Image Grid */}
        <PostImageGrid imageUrls={post.imageUrls} onImageClick={onImageClick} />

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
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              stopPropagation(e);
              onReply(effectivePost);
            }}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm">{effectivePost.repliesCount || 0}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onPointerDown={handleRepostPointerDown}
            onPointerUp={handleRepostPointerUp}
            onPointerCancel={handleRepostPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex items-center space-x-2 group/action transition-colors ${effectivePost.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
          >
            <div className="p-2 group-hover/action:bg-green-50 rounded-full transition-colors">
              <Repeat className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm">{effectivePost.repostsCount || 0}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              stopPropagation(e);
              onLike(effectivePost);
            }}
            className={`flex items-center space-x-2 group/action transition-colors ${effectivePost.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
          >
            <div className="p-2 group-hover/action:bg-red-50 rounded-full transition-colors">
              <Heart className={`w-4.5 h-4.5 ${effectivePost.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
            </div>
            <span className="text-sm">{effectivePost.likesCount || 0}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              stopPropagation(e);
              // Future: show full post analytics here
            }}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <BarChart2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm">
              {effectivePost.viewCount || Math.max((effectivePost.likesCount || 0) * 11 + (effectivePost.repostsCount || 0) * 23 + (effectivePost.repliesCount || 0) * 14 + 1, 1)}
            </span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleBookmark}
            className={`flex items-center space-x-2 group/action transition-colors ${userProfile?.bookmarks?.includes(effectivePost.id) ? 'text-blue-500' : 'hover:text-blue-500'}`}
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              {userProfile?.bookmarks?.includes(effectivePost.id) ? (
                <BookmarkCheck className="w-4.5 h-4.5 fill-current" />
              ) : (
                <Bookmark className="w-4.5 h-4.5" />
              )}
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="flex items-center space-x-2 group/action hover:text-blue-500 transition-colors"
          >
            <div className="p-2 group-hover/action:bg-blue-50 rounded-full transition-colors">
              <Send className="w-4.5 h-4.5" />
            </div>
          </motion.button>

          {userProfile && userProfile.uid !== effectivePost.authorId && effectivePost.authorId !== 'anonymous' && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                stopPropagation(e);
                setIsTipModalOpen(true);
              }}
              className="flex items-center space-x-2 group/action hover:text-yellow-500 transition-colors"
            >
              <div className="p-2 group-hover/action:bg-yellow-50 rounded-full transition-colors">
                <Gift className="w-4.5 h-4.5" />
              </div>
            </motion.button>
          )}
        </div>
        </div>
      </div>
      
      <TipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        senderId={userProfile?.uid}
        senderPoints={userProfile?.points || 0}
        receiverId={effectivePost.authorId}
        receiverName={effectivePost.authorName}
      />

      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={effectivePost.id}
        targetType="post"
        targetData={{ authorId: effectivePost.authorId, content: effectivePost.content }}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => onDelete(post.id)}
        title="Apagar post?"
        message="Tem certeza que deseja apagar este post? Esta ação não pode ser desfeita e o post será removido permanentemente."
        confirmText="Sim, apagar"
        cancelText="Cancelar"
        type="danger"
      />
    </motion.article>
  );
}
