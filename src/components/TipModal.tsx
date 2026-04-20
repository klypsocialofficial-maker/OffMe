import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, AlertCircle } from 'lucide-react';
import { sendTip } from '../services/gamificationService';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderId: string;
  senderPoints: number;
  receiverId: string;
  receiverName: string;
}

export default function TipModal({ isOpen, onClose, senderId, senderPoints, receiverId, receiverName }: TipModalProps) {
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const presets = [10, 50, 100, 500];

  const handleSendTip = async () => {
    if (amount <= 0 || amount > senderPoints) {
      setError("Pontos insuficientes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendTip(senderId, receiverId, amount);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao doar postos.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl overflow-hidden"
        >
          {success ? (
            <div className="text-center py-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gorjeta Enviada!</h3>
              <p className="text-gray-500 font-medium">Você enviou {amount} pontos para {receiverName}.</p>
            </div>
          ) : (
            <>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="mb-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-yellow-500 shadow-inner">
                  <Gift className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">Gorjeta para {receiverName}</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Seu saldo atual: <span className="text-black font-bold">{senderPoints} pts</span></p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-2xl text-sm flex items-start space-x-2 border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`py-3 rounded-2xl font-bold text-lg transition-all border-2 ${
                      amount === preset
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    {preset} pts
                  </button>
                ))}
              </div>

              <div className="flex space-x-3 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendTip}
                  disabled={loading || amount > senderPoints}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold transition-all shadow-md group ${
                    loading || amount > senderPoints
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-black text-white hover:bg-gray-800 hover:-translate-y-0.5'
                  }`}
                >
                  <Gift className="w-5 h-5" />
                  <span>Enviar</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
