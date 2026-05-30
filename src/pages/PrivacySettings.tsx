import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, UserX, Lock, ChevronRight, CheckCircle2, VolumeX, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import UserListModal from '../components/UserListModal';
import TwoFactorModal from '../components/TwoFactorModal';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [mutedWord, setMutedWord] = useState('');
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    privateProfile: false,
    sensitiveContent: false,
    discoverability: true,
    directMessages: 'everyone' as 'everyone' | 'following' | 'none'
  });

  useEffect(() => {
    if (userProfile) {
      setSettings({
        privateProfile: userProfile.privateProfile || false,
        sensitiveContent: userProfile.sensitiveContent || false,
        discoverability: userProfile.discoverability !== false,
        directMessages: userProfile.directMessages || 'everyone'
      });
      setMutedWords(userProfile.mutedWords || []);
    }
  }, [userProfile]);

  const updateSetting = async (key: string, value: any) => {
    if (!userProfile?.uid || !db) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        [key]: value
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating privacy setting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMutedWord = async () => {
    if (!mutedWord.trim() || !userProfile?.uid || !db) return;
    const word = mutedWord.trim().toLowerCase();
    if (mutedWords.includes(word)) return;

    try {
      const newWords = [...mutedWords, word];
      await updateDoc(doc(db, 'users', userProfile.uid), {
        mutedWords: newWords
      });
      setMutedWords(newWords);
      setMutedWord('');
    } catch (error) {
      console.error('Error adding muted word:', error);
    }
  };

  const handleRemoveMutedWord = async (word: string) => {
    if (!userProfile?.uid || !db) return;
    try {
      const newWords = mutedWords.filter(w => w !== word);
      await updateDoc(doc(db, 'users', userProfile.uid), {
        mutedWords: newWords
      });
      setMutedWords(newWords);
    } catch (error) {
      console.error('Error removing muted word:', error);
    }
  };

  return (
    <div className="w-full h-full bg-white/50 dark:bg-black/50 flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-display font-black italic tracking-tighter text-black">Privacidade e segurança</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20 pt-[calc(60px+env(safe-area-inset-top))]">
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Sua atividade no OffMe</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold dark:text-white text-sm">Status do Perfil</h3>
                  <p className="text-xs text-gray-500">Defina quem pode interagir e ver suas publicações.</p>
                </div>
                {loading && (
                  <div className="border-2 border-blue-500 border-t-transparent w-4 h-4 rounded-full animate-spin"></div>
                )}
              </div>
              
              <div className="bg-black/5 dark:bg-zinc-800/50 p-1 rounded-xl flex relative">
                <button
                  type="button"
                  onClick={() => updateSetting('privateProfile', false)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all relative z-10 ${!settings.privateProfile ? 'text-black dark:text-white font-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Perfil Público</span>
                  {!settings.privateProfile && (
                    <motion.div
                      layoutId="activePrivacy"
                      className="absolute inset-0 bg-white dark:bg-zinc-850 rounded-lg shadow-sm border border-black/5 dark:border-white/5 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('privateProfile', true)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all relative z-10 ${settings.privateProfile ? 'text-black dark:text-white font-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Perfil Privado</span>
                  {settings.privateProfile && (
                    <motion.div
                      layoutId="activePrivacy"
                      className="absolute inset-0 bg-white dark:bg-zinc-850 rounded-lg shadow-sm border border-black/5 dark:border-white/5 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              <div className="text-xs text-gray-500 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-black/5 dark:border-white/5 transition-all">
                {settings.privateProfile ? (
                  <p className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-blue-500 font-bold shrink-0">🔒</span>
                    <span>Ao tornar seu perfil <strong>Privado</strong>, somente pessoas que você aprovar poderão seguir você e ver seus posts ou curtidas. Seus seguidores existentes não são afetados.</span>
                  </p>
                ) : (
                  <p className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-blue-500 font-bold shrink-0">🌍</span>
                    <span>No modo <strong>Público</strong>, qualquer visitante ou membro do OffMe pode seguir sua conta selvagemmente, visualizar seus posts, reposts, curtidas e mídias livremente.</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold dark:text-white">Conteúdo sensível</h3>
                  <p className="text-xs text-gray-500">Mostrar mídia que pode conter conteúdo sensível.</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('sensitiveContent', !settings.sensitiveContent)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.sensitiveContent ? 'bg-purple-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.sensitiveContent ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Mensagens Diretas</h2>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
            {(['everyone', 'following', 'none'] as const).map((option) => (
              <button
                key={option}
                onClick={() => updateSetting('directMessages', option)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <span className="capitalize dark:text-white">
                  {option === 'everyone' ? 'Todos' : option === 'following' ? 'Pessoas que você segue' : 'Ninguém'}
                </span>
                {settings.directMessages === option && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Segurança</h2>
          <div className="space-y-4">
            <button 
              onClick={() => setIsBlockedModalOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold dark:text-white">Contas bloqueadas</h3>
                  <p className="text-xs text-gray-500">Gerencie as contas que você bloqueou.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button 
              onClick={() => setIs2faModalOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${userProfile?.twoFactorEnabled ? 'bg-emerald-100 dark:bg-emerald-990/30 text-emerald-600 dark:text-emerald-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold dark:text-white">Autenticação em duas etapas</h3>
                    {userProfile?.twoFactorEnabled && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold uppercase rounded-md tracking-wider">
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {userProfile?.twoFactorEnabled 
                      ? 'Sua conta está protegida por PIN.' 
                      : 'Adicione uma camada extra de segurança.'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-4 px-1">
             <VolumeX className="w-5 h-5 text-gray-500" />
             <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Palavras Mutadas</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4 px-1">
            Posts que contêm essas palavras ou hashtags serão ocultados do seu feed.
          </p>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: futebol, #politica"
                value={mutedWord}
                onChange={(e) => setMutedWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMutedWord()}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 transition-all dark:text-white"
              />
              <button 
                onClick={handleAddMutedWord}
                disabled={!mutedWord.trim()}
                className="absolute right-2 top-1.5 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {mutedWords.map((word) => (
                <motion.span
                  key={word}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-bold dark:text-gray-200"
                >
                  <span>{word}</span>
                  <button onClick={() => handleRemoveMutedWord(word)} className="text-gray-400 hover:text-red-500 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
              {mutedWords.length === 0 && (
                <p className="text-[10px] text-gray-400 italic font-medium px-1">Você ainda não silenciou nenhuma palavra.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <UserListModal 
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
        title="Contas bloqueadas"
        uids={userProfile?.blockedUsers || []}
        isBlockedList
      />

      <TwoFactorModal 
        isOpen={is2faModalOpen}
        onClose={() => setIs2faModalOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
}
