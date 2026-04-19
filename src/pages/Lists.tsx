import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { List as ListIcon, Plus, Users, ChevronRight, X, UserPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import { getDefaultAvatar } from '../lib/avatar';
import VerifiedBadge from '../components/VerifiedBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function Lists() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, listId: string }>({ isOpen: false, listId: '' });

  useEffect(() => {
    const fetchLists = async () => {
      if (!db || !userProfile?.uid) return;
      try {
        const q = query(
          collection(db, 'lists'),
          where('ownerId', '==', userProfile.uid)
        );
        const snap = await getDocs(q);
        setLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching lists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [userProfile?.uid]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || creating || !userProfile) return;

    try {
      setCreating(true);
      const listData = {
        name: newListName.trim(),
        description: newListDesc.trim(),
        ownerId: userProfile.uid,
        memberIds: [],
        isPrivate,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'lists'), listData);
      setLists(prev => [{ id: docRef.id, ...listData }, ...prev]);
      setIsModalOpen(false);
      setNewListName('');
      setNewListDesc('');
      setIsPrivate(false);
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async () => {
    const { listId } = deleteModal;
    if (!listId) return;
    try {
      await deleteDoc(doc(db, 'lists', listId));
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent pb-20">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 p-4 flex items-center justify-between">
        <h1 className="text-xl font-black">Suas Listas</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Carregando listas...</div>
        ) : lists.length > 0 ? (
          lists.map(list => (
            <motion.div 
              key={list.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="liquid-glass-card p-4 rounded-2xl flex items-center justify-between group"
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/lists/${list.id}`)}
              >
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg">{list.name}</h3>
                  {list.isPrivate && <Trash2 className="w-4 h-4 text-gray-400" />} {/* Placeholder for lock icon or similar */}
                </div>
                <p className="text-gray-500 text-sm line-clamp-1">{list.description || 'Sem descrição'}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">{list.memberIds?.length || 0} membros</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setDeleteModal({ isOpen: true, listId: list.id })}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <ListIcon className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold text-black mb-1">Você não tem listas</p>
            <p className="text-sm">Crie uma lista para organizar seus feeds favoritos.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 bg-black text-white px-6 py-2 rounded-full font-bold text-sm"
            >
              Criar Lista
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Nova Lista</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateList} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 ml-1 text-gray-700">Nome</label>
                  <input 
                    type="text" 
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Ex: Desenvolvedores"
                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 ml-1 text-gray-700">Descrição (opcional)</label>
                  <textarea 
                    value={newListDesc}
                    onChange={(e) => setNewListDesc(e.target.value)}
                    placeholder="De que se trata esta lista?"
                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-black/5 outline-none resize-none h-24"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">Privada</p>
                    <p className="text-xs text-gray-500">Apenas você poderá ver esta lista.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPrivate ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!newListName.trim() || creating}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors mt-4 shadow-lg active:scale-[0.98]"
                >
                  {creating ? 'Criando...' : 'Criar Lista'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, listId: '' })}
        onConfirm={handleDeleteList}
        title="Excluir lista?"
        message="Tem certeza que deseja remover esta lista permanentemente? Todos os membros marcados e as configurações da lista serão perdidos."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
