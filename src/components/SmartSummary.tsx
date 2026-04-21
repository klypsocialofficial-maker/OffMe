import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { generateSmartSummary } from '../services/aiService';
import { collection, query, limit, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function SmartSummary() {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('privacy', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => doc.data());
      
      const text = await generateSmartSummary(posts);
      setSummary(text);
    } catch (error) {
      console.error("Error fetching summary:", error);
      setSummary("O papo tá rendendo mas não consegui resumir agora. Tenta jaja! 👻");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-[32px] p-5 shadow-sm overflow-hidden relative group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-black italic uppercase tracking-tighter text-sm dark:text-white">Resumo Inteligente</h3>
        </div>
        <button 
          onClick={fetchSummary}
          disabled={loading}
          className={`p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2 py-2"
          >
            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-[80%] animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-[60%] animate-pulse" />
          </motion.div>
        ) : (
          <motion.p 
            key="content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic"
          >
            {summary}
          </motion.p>
        )}
      </AnimatePresence>
      
      <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
    </div>
  );
}
