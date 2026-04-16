import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, UserX, Lock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="w-full h-full bg-white dark:bg-black overflow-y-auto pb-20">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 dark:text-white" />
          </button>
          <h1 className="text-xl font-black tracking-tight dark:text-white">Privacidade e segurança</h1>
        </div>
      </div>

      <div className="p-4 space-y-8">
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Sua atividade no OffMe</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold dark:text-white">Conta privada</h3>
                  <p className="text-xs text-gray-500">Apenas seus seguidores podem ver seus posts.</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('privateProfile', !settings.privateProfile)}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.privateProfile ? 'bg-blue-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.privateProfile ? 'left-7' : 'left-1'}`} />
              </button>
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
            <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
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

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold dark:text-white">Autenticação em duas etapas</h3>
                  <p className="text-xs text-gray-500">Adicione uma camada extra de segurança.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
