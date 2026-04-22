import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, FileText } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const VerificationRequestModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('Creator');
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid || !reason.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'verificationRequests'), {
        userId: userProfile.uid,
        reason: reason.trim(),
        category,
        documentUrl: documentUrl.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      onClose();
      // Show toast if possible, maybe add prop for it
    } catch (error) {
      console.error("Error submitting verification request:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-lg pointer-events-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic">Solicitar Verificação</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria da Conta</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option>Creator</option>
                    <option>Brand</option>
                    <option>Public Figure</option>
                    <option>Organization</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Por que você merece o selo?</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                    placeholder="Conte-nos um pouco sobre você..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link para documento (Opcional)</label>
                  <input
                    type="url"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center space-x-2 hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Solicitação</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VerificationRequestModal;
