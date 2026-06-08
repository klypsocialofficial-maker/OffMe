import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Edit3, Send, ArrowLeft, Plus, Wifi, WifiOff, Loader2, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOfflineDrafts, OfflineDraft } from '../hooks/useOfflineDrafts';
import { triggerHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Drafts() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { userProfile } = useAuth();
  const { 
    drafts, 
    deleteDraft, 
    syncDrafts, 
    isSyncing, 
    isOnline,
    isCloudSyncEnabled,
    isCloudSyncing,
    toggleCloudSync,
    performCloudSync
  } = useOfflineDrafts();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleEditDraft = (draft: OfflineDraft) => {
    triggerHaptic('light');
    
    // Save the values to standard modal composer file
    const postData = {
      content: draft.content,
      isAnonymous: draft.isAnonymous,
      postAudience: draft.postAudience,
      gifUrl: draft.gifUrl,
      showPoll: draft.showPoll,
      pollOptions: draft.pollOptions,
      altText: draft.altText,
      images: draft.images
    };

    localStorage.setItem('klyp_post_composer_draft', JSON.stringify(postData));

    // Delete from offline drafts so we don't have duplicates
    deleteDraft(draft.id);

    // Open create modal
    window.dispatchEvent(
      new CustomEvent('open-create-modal', {
        detail: {
          replyTo: draft.replyTo,
          quotePost: draft.quotePost,
          isAnonymous: draft.isAnonymous,
        },
      })
    );
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      triggerHaptic('warning');
      alert('Você precisa estar conectado à internet para sincronizar!');
      return;
    }
    triggerHaptic('selection');
    await syncDrafts();
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24 transition-colors">
      {/* Top Header */}
      <div className="sticky top-0 z-35 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate(-1);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500 dark:text-zinc-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white flex items-center space-x-2">
              <span>{t('nav.drafts') || 'Rascunhos'}</span>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                {drafts.length}
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Postagens salvas que não foram enviadas</p>
          </div>
        </div>

        {drafts.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={!isOnline || isSyncing}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${
              isOnline 
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Sincronizar Tudo</span>
          </button>
        )}
      </div>

      {/* Connection Info Banner */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
          isOnline
            ? 'bg-green-50/50 border-green-100/55 dark:bg-green-950/20 dark:border-green-900/35 text-green-700 dark:text-green-400'
            : 'bg-amber-50/50 border-amber-100/55 dark:bg-amber-950/20 dark:border-amber-900/35 text-amber-700 dark:text-amber-400'
        }`}>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-xs font-bold">
              {isOnline 
                ? 'Você está online e seus rascunhos podem ser publicados.' 
                : 'Você está navegando offline. Rascunhos adicionados serão salvos aqui.'}
            </span>
          </div>
          {isOnline && drafts.length > 0 && !isSyncing && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-green-500 text-white px-2 py-0.5 rounded-full animate-bounce">
              Pronto
            </span>
          )}
        </div>
      </div>

      {/* Cloud Sync Controller Banner */}
      <div className="max-w-2xl mx-auto px-4 mt-3">
        {!userProfile ? (
          <div className="p-4 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-900/20 text-center flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center space-x-2 text-zinc-400 dark:text-zinc-500">
              <CloudOff className="w-5 h-5" />
              <span className="font-bold text-sm">Sincronização na Nuvem Indisponível</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md">
              Faça login em sua conta para ativar a sincronização na nuvem e poder acessar seus rascunhos em qualquer outro dispositivo.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className={`p-2.5 rounded-2xl ${isCloudSyncEnabled ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500'} transition-colors`}>
                <Cloud className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                  Sincronização na nuvem
                  {isCloudSyncEnabled && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  )}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Backup e sincronização em tempo real das mensagens e mídias rascunhadas.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-center">
              {isCloudSyncEnabled && (
                <button
                  onClick={async () => {
                    triggerHaptic('light');
                    await performCloudSync();
                  }}
                  disabled={isCloudSyncing || !isOnline}
                  className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
                  title="Sincronizar agora"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              )}
              
              <button
                role="checkbox"
                aria-checked={isCloudSyncEnabled}
                onClick={() => toggleCloudSync(!isCloudSyncEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCloudSyncEnabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-zinc-850'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isCloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content List */}
      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {drafts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Nenhum rascunho salvo</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mt-0.5">
                  Não possui rascunhos em fila. Seus rascunhos salvos manualmente ou criados no modo offline aparecerão aqui.
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  window.dispatchEvent(new CustomEvent('open-create-modal'));
                }}
                className="flex items-center space-x-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-xs transition-colors shadow-lg shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Post</span>
              </button>
            </motion.div>
          ) : (
            drafts.map((draft) => (
              <motion.div
                key={draft.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col group"
              >
                {/* Draft Syncing Loader Overlay */}
                {draft.isSyncing && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10 animate-fade-in">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-black text-blue-500 uppercase tracking-wider animate-pulse">
                      Publicando...
                    </span>
                  </div>
                )}

                {/* Card Header meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full">
                      {draft.isAnonymous ? 'Anônimo' : 'Meu Perfil'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                      {draft.postAudience === 'circle' ? 'Círculo' : 'Público'}
                    </span>
                    {draft.communityName && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-full">
                        Em: {draft.communityName}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 font-mono">
                    {new Date(draft.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Post Content */}
                <p className="text-sm text-gray-800 dark:text-zinc-100 leading-relaxed break-words whitespace-pre-wrap font-medium">
                  {draft.content || <span className="italic text-gray-400 dark:text-zinc-600">Sem conteúdo de texto...</span>}
                </p>

                {/* Poll Details if showPoll */}
                {draft.showPoll && draft.pollOptions && draft.pollOptions.length > 0 && (
                  <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl border border-gray-100 dark:border-zinc-700/50 space-y-1.5">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Enquete Salva</span>
                    {draft.pollOptions.map((opt, idx) => opt.trim() !== '' && (
                      <div key={idx} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-300">
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Thumbnails gallery */}
                {draft.images && draft.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {draft.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 relative bg-zinc-50 dark:bg-zinc-900 group/img">
                        <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white px-1.5 py-0.5 bg-black/60 rounded-full tracking-wider uppercase font-mono">
                            {img.type.split('/')[1]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply info */}
                {draft.replyTo && (
                  <div className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1 rounded-xl w-fit">
                    Em resposta a @{draft.replyTo.authorUsername}
                  </div>
                )}

                {/* Actions bottom bar */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-50 dark:border-zinc-800/50">
                  <button
                    onClick={() => {
                      triggerHaptic('warning');
                      deleteDraft(draft.id);
                    }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 dark:text-zinc-500 rounded-full transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditDraft(draft)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-white rounded-full transition-all"
                    title="Editar / Continuar Escrevendo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
