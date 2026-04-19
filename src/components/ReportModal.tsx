import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'user' | 'comment' | 'community';
  targetData?: any;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', description: 'Conteúdo repetitivo ou links maliciosos' },
  { id: 'hate', label: 'Discurso de ódio', description: 'Conteúdo que ataca ou desumaniza' },
  { id: 'harassment', label: 'Assédio', description: 'Comportamento abusivo direcionado' },
  { id: 'violence', label: 'Violência', description: 'Ameaças ou conteúdo violento' },
  { id: 'nude', label: 'Nudez ou conteúdo sexual', description: 'Conteúdo impróprio para a plataforma' },
  { id: 'other', label: 'Outro motivo', description: 'Algo que não se encaixa nas categorias acima' }
];

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetData }: ReportModalProps) {
  const { userProfile } = useAuth();
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !userProfile?.uid) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        targetId,
        targetType,
        targetData: targetData || null,
        reason: selectedReason,
        details,
        reporterId: userProfile.uid,
        reporterUsername: userProfile.username,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setStep('success');
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-500" />
                <h2 className="font-black italic tracking-tighter">Denunciar</h2>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto overflow-x-hidden">
              <AnimatePresence mode="wait">
                {step === 'reason' && (
                  <motion.div
                    key="reason"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <p className="text-gray-500 text-sm mb-4">Por que você está denunciando este conteúdo?</p>
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => {
                          setSelectedReason(reason.id);
                          setStep('details');
                        }}
                        className="w-full p-4 bg-gray-50 hover:bg-red-50 hover:border-red-100 border border-transparent rounded-2xl flex items-center justify-between group transition-all"
                      >
                        <div className="text-left">
                          <p className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">{reason.label}</p>
                          <p className="text-xs text-gray-500">{reason.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400" />
                      </button>
                    ))}
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <p className="text-sm font-bold mb-2">Detalhes adicionais (opcional)</p>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Conte-nos mais para nos ajudar a entender o problema..."
                      className="w-full h-32 bg-gray-50 border border-black/5 rounded-2xl p-4 text-sm outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/5 transition-all"
                    />
                    <div className="flex space-x-3 mt-6">
                      <button
                        onClick={() => setStep('reason')}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] py-3 px-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-600/10 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Enviando...' : 'Enviar denúncia'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg italic">Obrigado por ajudar!</h3>
                    <p className="text-gray-500 text-sm mt-1 max-w-xs">
                      Sua denúncia foi enviada e nossa equipe de moderação irá analisar o conteúdo em breve.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-8 w-full py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
                    >
                      Entendido
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
