import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, AlertCircle, Heart, Star, Zap, Flame, Crown, Ghost } from 'lucide-react';
import { sendGift } from '../services/gamificationService';
import { GIFTS, GiftType } from '../constants/gifts';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderId: string;
  senderPoints: number;
  receiverId: string;
  receiverName: string;
  postId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function TipModal({ isOpen, onClose, senderId, senderPoints, receiverId, receiverName, postId, onSuccess, onError }: TipModalProps) {
  const [selectedGift, setSelectedGift] = useState<GiftType>(GIFTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSendGift = async () => {
    if (selectedGift.price > senderPoints) {
      setError("Saldo insuficiente.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendGift(senderId, receiverId, selectedGift.id, postId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || "Erro ao enviar mimo.";
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md p-8 shadow-2xl overflow-hidden border border-white/20"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-100 to-transparent dark:from-yellow-900/20 -z-10" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div 
              animate={{ 
                rotate: [0, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 bg-yellow-400 rounded-[30px] flex items-center justify-center mb-4 text-white shadow-lg shadow-yellow-400/30"
            >
              <Gift className="w-10 h-10" />
            </motion.div>
            <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white uppercase leading-tight">Enviar um Mimo para<br/> <span className="text-blue-500">@{receiverName}</span></h2>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-4 px-4 bg-gray-100 dark:bg-white/5 py-1.5 rounded-full">
              Seu saldo: <span className="text-black dark:text-white">{senderPoints.toLocaleString()} pts</span>
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold flex items-start space-x-2 border border-red-100 dark:border-red-900/50"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Gifts Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8 overflow-y-auto max-h-[300px] p-1">
            {GIFTS.map((gift) => {
              const Icon = gift.icon;
              return (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGift(gift)}
                  className={`group flex flex-col items-center p-3 rounded-[30px] transition-all border-2 relative ${
                    selectedGift.id === gift.id
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-400/20'
                      : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-3 rounded-2xl mb-2 transition-transform group-hover:scale-110 ${selectedGift.id === gift.id ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}>
                    <Icon className={`w-8 h-8 ${gift.color}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-900 dark:text-white mb-1">{gift.name}</span>
                  <span className={`text-[10px] font-black tracking-widest ${selectedGift.id === gift.id ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {gift.price} PTS
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col space-y-3">
             <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-2">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold italic">
                  "{selectedGift.description}"
                </p>
             </div>
            <button
              onClick={handleSendGift}
              disabled={loading || selectedGift.price > senderPoints}
              className={`w-full flex items-center justify-center space-x-3 py-4 rounded-[30px] font-black italic uppercase tracking-tighter transition-all shadow-xl text-lg ${
                loading || selectedGift.price > senderPoints
                  ? 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-300" />
                </div>
              ) : (
                <>
                  <Gift className="w-6 h-6" />
                  <span>Enviar Mimo</span>
                </>
              )}
            </button>
            <p className="text-[9px] text-gray-400 text-center uppercase font-black tracking-widest">
              O criador receberá 50% do valor em pontos Klyp.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
