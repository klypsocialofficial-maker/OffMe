import React, { useState } from 'react';
import { AlertCircle, X, Flag, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'user' | 'comment';
  targetName?: string;
}

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetName }: ReportModalProps) {
  const { reportContent } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const reasons = [
    'Spam ou conteúdo enganoso',
    'Discurso de ódio ou assédio',
    'Nudez ou conteúdo sexual',
    'Violência ou conteúdo gráfico',
    'Automutilação ou suicídio',
    'Atividade ilegal ou regulamentada',
    'Propriedade intelectual',
    'Informação falsa (Fake News)',
    'Outro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await reportContent(targetType, targetId, reason, details);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (error) {
      console.error('Error reporting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-50 rounded-xl">
                <Flag className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xl font-black italic tracking-tighter">Denunciar {targetType === 'post' ? 'Publicação' : 'Perfil'}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h4 className="text-lg font-bold mb-2">Denúncia Enviada</h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  Obrigado por nos ajudar a manter a comunidade segura. Nossa equipe analisará {targetType === 'post' ? 'esta publicação' : 'este perfil'} em breve.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Por que você está denunciando isso?</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                    {reasons.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                          reason === r 
                            ? 'bg-black text-white shadow-lg' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mais detalhes (opcional)</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Forneça mais informações sobre a violação..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none transition-all resize-none h-24"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!reason || isSubmitting}
                    className={`flex-1 px-6 py-3.5 bg-black text-white rounded-full font-bold text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale`}
                  >
                    {isSubmitting ? 'Enviando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
