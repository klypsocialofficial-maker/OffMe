import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Instagram, Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

export default function SharePostModal({ isOpen, onClose, post }: SharePostModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!post) return null;

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `post-${post.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Compartilhar Post',
          text: 'Confira este post no Rulio!',
        });
      } else {
        // Fallback: Download the image
        const link = document.createElement('a');
        link.download = `rulio-post-${post.id}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Compartilhar</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-gray-50 flex justify-center">
              {/* This is the card that will be captured */}
              <div 
                ref={cardRef}
                className="w-[320px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 relative"
                style={{ aspectRatio: '4/5' }}
              >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50 rounded-full -ml-16 -mb-16 blur-3xl opacity-50" />

                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                      {post.authorPhoto ? (
                        <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Share2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 leading-tight">{post.authorName}</div>
                      <div className="text-gray-500 text-sm">@{post.authorUsername}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-xs">R</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-800 text-lg leading-relaxed mb-4 break-words">
                    {post.content}
                  </div>

                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-100 mb-4 flex-grow">
                      <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center text-gray-400 text-xs">
                    <span>rulio.app</span>
                    <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 gap-3">
              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Instagram className="w-5 h-5" />
                    <span>Compartilhar no Stories</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="w-full bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>Salvar Imagem</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
