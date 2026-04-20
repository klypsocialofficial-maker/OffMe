import React, { useState } from 'react';
import { X, Globe, Shield, Image as ImageIcon, Layout, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (community: any) => void;
}

export default function CreateCommunityModal({ isOpen, onClose, onSuccess }: CreateCommunityModalProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'Geral',
    privacy: 'public' as 'public' | 'private',
    themeColor: '#3B82F6'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setLoading(true);
    setError('');

    try {
      // 1. Basic validation
      if (formData.name.length < 3) throw new Error("Nome muito curto");
      if (formData.slug.length < 3) throw new Error("Slug muito curto");
      if (!/^[a-z0-9-]+$/.test(formData.slug)) throw new Error("Slug deve conter apenas letras minúsculas, números e hifens");

      // 2. Check if slug is taken
      const q = query(collection(db, 'communities'), where('slug', '==', formData.slug));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Este slug já está em uso");

      // 3. Create community
      const newCommunity = {
        ...formData,
        founderId: userProfile.uid,
        founderName: userProfile.displayName,
        founderUsername: userProfile.username,
        members: [userProfile.uid],
        moderators: [userProfile.uid],
        memberCount: 1,
        postsCount: 0,
        iconUrl: null,
        bannerUrl: null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'communities'), newCommunity);
      onSuccess({ id: docRef.id, ...newCommunity });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-2xl font-black italic tracking-tighter">Criar Comunidade</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center space-x-2">
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Nome da Comunidade</label>
                <div className="relative group">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold"
                    placeholder="Ex: Gamers do Brasil"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">URL da Comunidade (Slug)</label>
                <div className="flex items-center space-x-2 text-sm bg-gray-50 p-4 rounded-2xl border border-transparent focus-within:border-blue-500 transition-all font-mono font-bold text-gray-500">
                  <span>offme.app/c/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="bg-transparent outline-none flex-1 text-blue-600 lowercase"
                    placeholder="gamers-brasil"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Descrição</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl py-4 px-4 outline-none transition-all font-medium min-h-[100px] resize-none"
                  placeholder="Sobre o que é esta comunidade?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Privacidade</label>
                  <select
                    value={formData.privacy}
                    onChange={(e) => setFormData(p => ({ ...p, privacy: e.target.value as any }))}
                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl py-4 px-4 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="public">Pública</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Tema</label>
                  <input
                    type="color"
                    value={formData.themeColor}
                    onChange={(e) => setFormData(p => ({ ...p, themeColor: e.target.value }))}
                    className="w-full h-[58px] bg-gray-50 rounded-2xl p-2 cursor-pointer border-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-[1.5rem] font-bold shadow-xl shadow-black/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Comunidade'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
