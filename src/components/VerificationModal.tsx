import React, { useState } from 'react';
import { ShieldCheck, X, CheckCircle2, ChevronRight, FileText, Globe, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const { requestVerification, userProfile } = useAuth();
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const categories = [
    'Notícias/Jornalismo',
    'Esportes',
    'Governo/Política',
    'Música',
    'Entretenimento',
    'Criador de Conteúdo/Influenciador',
    'Negócios/Empresa',
    'Outro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !category) return;

    setIsSubmitting(true);
    try {
      await requestVerification(reason, category, documentUrl);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error requesting verification:', error);
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
              <div className="p-2 bg-blue-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-xl font-black italic tracking-tighter">Solicitar Verificação</h3>
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
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-blue-500" />
                </div>
                <h4 className="text-lg font-bold mb-2">Solicitação Enviada</h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  Sua solicitação foi enviada para análise. Notificaremos você assim que tivermos uma resposta. Isso pode levar alguns dias úteis.
                </p>
                <button
                  onClick={onClose}
                  className="mt-8 w-full py-4 bg-black text-white rounded-full font-bold text-sm shadow-xl"
                >
                  Entendi
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 ? (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                    <p className="text-sm text-gray-500">Para ser verificado no Offme, sua conta deve ser autêntica, notável e ativa.</p>
                    
                    <div className="grid grid-cols-1 gap-2">
                       <h4 className="text-sm font-bold text-gray-700 mb-1">Selecione uma categoria</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategory(cat)}
                              className={`text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                                category === cat ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                       </div>
                    </div>

                    <button
                      type="button"
                      disabled={!category}
                      onClick={() => setStep(2)}
                      className="w-full flex items-center justify-center space-x-2 py-4 bg-black text-white rounded-full font-bold text-sm shadow-xl disabled:opacity-50"
                    >
                      <span>Continuar</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Por que você deve ser verificado?</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explique sua relevância ou presença em outras plataformas..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Link para documento ou site (opcional)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                          placeholder="https://exemplo.com/perfil"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 ml-1 leading-tight">Links para perfis em outras redes sociais, artigos de notícias ou site oficial ajudam na análise.</p>
                    </div>

                    <div className="flex space-x-3 pt-2">
                       <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={!reason || isSubmitting}
                        className="flex-1 px-6 py-3.5 bg-blue-500 text-white rounded-full font-bold text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Enviando...' : 'Pedir Verificação'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
