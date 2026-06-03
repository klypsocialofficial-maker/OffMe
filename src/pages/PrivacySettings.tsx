import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, UserX, Lock, ChevronRight, CheckCircle2, VolumeX, Plus, X, Download, Trash2, FileText, ShieldAlert, RotateCcw, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import UserListModal from '../components/UserListModal';
import TwoFactorModal from '../components/TwoFactorModal';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { userProfile, deleteAccount, showToast } = useAuth();
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

  // LGPD Specific States
  const [isLgpdDataOpen, setIsLgpdDataOpen] = useState(false);
  const [isLgpdDeleteOpen, setIsLgpdDeleteOpen] = useState(false);
  const [lgpdConfirmUsername, setLgpdConfirmUsername] = useState('');
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [consentRevoked, setConsentRevoked] = useState(false);

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
      if (showToast) {
        showToast("Configuração de privacidade atualizada!", "success");
      }
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      if (showToast) {
        showToast("Erro ao sincronizar configuração.", "error");
      }
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
      if (showToast) {
        showToast(`Palavra "${word}" foi silenciada do seu feed.`, "success");
      }
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
      if (showToast) {
        showToast(`Palavra "${word}" removida do silenciador.`, "info");
      }
    } catch (error) {
      console.error('Error removing muted word:', error);
    }
  };

  // LGPD Art. 18, V - Data Portability Action (Download Data as JSON File)
  const handleExportData = () => {
    try {
      const dataToExport = {
        meta: {
          exportDate: new Date().toISOString(),
          applicableLaw: "Lei Geral de Proteção de Dados Pessoais (LGPD - Lei 13.709/218), Artigo 18, V - Portabilidade de Dados",
          platform: "OffMe Secure Social Hub",
          dataController: "OffMe Community & Teams",
          dpoContact: "privacidade@offme.app",
          legalDisclaimer: "Documento eletrônico seguro de uso exclusivo do titular conforme permissão legal."
        },
        profile: {
          uid: userProfile?.uid || 'anonimo',
          displayName: userProfile?.displayName || 'Anon',
          username: userProfile?.username || 'anon',
          email: userProfile?.email || 'N/A',
          isPremium: userProfile?.isPremium || false,
          premiumTier: userProfile?.premiumTier || 'none',
          points: userProfile?.points || 0,
          isVerified: userProfile?.isVerified || false,
          badgesEarned: userProfile?.badges || [],
          followersCount: userProfile?.followers?.length || 0,
          followingCount: userProfile?.following?.length || 0,
          createdAt: userProfile?.createdAt || 'N/A'
        },
        privacySettings: settings,
        mutedWords: mutedWords,
        blockedUsersCount: userProfile?.blockedUsers?.length || 0
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToExport, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `offme-portabilidade-lgpd-${userProfile?.username || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      if (showToast) {
        showToast("Portabilidade concluída! Seus dados pessoais foram exportados em formato JSON.", "success");
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast("Não foi possível gerar a portabilidade de dados.", "error");
      }
    }
  };

  // LGPD Art. 18, IX - Revocation of Consent & Clear Cache
  const handleRevokeConsent = () => {
    try {
      // Clear analytical trackers or local privacy caches safely
      sessionStorage.clear();
      localStorage.removeItem('offme_smart_summary');
      localStorage.removeItem('offme_smart_summary_time');
      
      setConsentRevoked(true);
      if (showToast) {
        showToast("Consentimento revogado! Cache analítico descartado localmente.", "success");
      }
      setTimeout(() => setConsentRevoked(false), 3000);
    } catch (e) {
      if (showToast) {
        showToast("Falha ao registrar termo de revogação legal.", "error");
      }
    }
  };

  // LGPD Art. 18, VI - Final Account & Data Deletion
  const handleDeleteAccountConfirm = async () => {
    if (lgpdConfirmUsername !== userProfile?.username) {
      if (showToast) {
        showToast("O nome de usuário digitado está incorreto. Digite seu @ exato.", "error");
      }
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      if (showToast) {
        showToast("Seus dados foram expurgados permanentemente conforme o Art. 18 da LGPD.", "success");
      }
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      if (showToast) {
        showToast("Erro ao confirmar exclusão. Tente fazer login novamente antes de prosseguir.", "error");
      }
    } finally {
      setLoading(false);
      setIsLgpdDeleteOpen(false);
    }
  };

  const formatLgpdDate = (val: any) => {
    if (!val) return 'Não cadastrado';
    if (val.seconds) {
      return new Date(val.seconds * 1000).toLocaleString('pt-BR');
    }
    return new Date(val).toLocaleString('pt-BR');
  };

  return (
    <div className="w-full h-full bg-white/50 dark:bg-black/50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-black dark:text-white" />
          </button>
          <h1 className="text-xl font-display font-black italic tracking-tighter text-black dark:text-white">Privacidade e segurança</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24 pt-[calc(60px+env(safe-area-inset-top))]">
        {/* Profile Status */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Sua atividade no OffMe</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-black dark:text-white text-sm">Status do Perfil</h3>
                  <p className="text-xs text-gray-500">Defina quem pode interagir e ver suas publicações.</p>
                </div>
                {loading && (
                  <div className="border-2 border-blue-500 border-t-transparent w-4 h-4 rounded-full animate-spin"></div>
                )}
              </div>
              
              <div className="bg-black/5 dark:bg-zinc-850 p-1 rounded-xl flex relative">
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
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-black/5 dark:border-white/5 -z-10"
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
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-black/5 dark:border-white/5 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              <div className="text-xs text-gray-500 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-black/5 dark:border-white/5 transition-all">
                {settings.privateProfile ? (
                  <p className="flex items-start space-x-2 leading-relaxed text-black dark:text-gray-300">
                    <span className="text-blue-500 font-bold shrink-0">🔒</span>
                    <span>Ao tornar seu perfil <strong>Privado</strong>, somente pessoas que você aprovar poderão seguir você e ver seus posts ou curtidas. Seus seguidores existentes não são afetados.</span>
                  </p>
                ) : (
                  <p className="flex items-start space-x-2 leading-relaxed text-gray-750 dark:text-gray-300">
                    <span className="text-blue-500 font-bold shrink-0">🌍</span>
                    <span>No modo <strong>Público</strong>, qualquer visitante ou membro do OffMe pode seguir você, visualizar seus posts, reposts, curtidas e mídias livremente.</span>
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
                  <h3 className="font-bold text-black dark:text-white">Conteúdo sensível</h3>
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

        {/* Direct Messages */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Mensagens Diretas</h2>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
            {(['everyone', 'following', 'none'] as const).map((option) => (
              <button
                key={option}
                onClick={() => updateSetting('directMessages', option)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                <span className="capitalize text-black dark:text-white text-sm font-medium">
                  {option === 'everyone' ? 'Todos' : option === 'following' ? 'Pessoas que você segue' : 'Ninguém'}
                </span>
                {settings.directMessages === option && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
              </button>
            ))}
          </div>
        </section>

        {/* Security / 2FA */}
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
                  <h3 className="font-bold text-black dark:text-white">Contas bloqueadas</h3>
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
                <div className={`p-2 rounded-full ${userProfile?.twoFactorEnabled ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600 dark:text-emerald-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-black dark:text-white">Autenticação em duas etapas</h3>
                    {userProfile?.twoFactorEnabled && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-450 font-bold uppercase rounded-md tracking-wider">
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

        {/* Muted Words */}
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
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-black dark:text-gray-200"
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

        {/* BRAZILIAN LGPD (Law 13.709/18) COMPLIANCE SUITE */}
        <section className="pt-6 border-t border-black/5 dark:border-white/5 space-y-6">
          <div className="flex items-center space-x-2 px-1">
            <Shield className="w-5 h-5 text-blue-500 shrink-0 animate-pulse" />
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Central de Privacidade LGPD</h2>
              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-black font-mono">Lei Geral de Proteção de Dados (nº 13.709)</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-zinc-400 px-1 leading-relaxed">
            Como uma rede focada em expressão segura e sob os pilares constitucionais brasileiros da privacidade, garantimos a você o amplo exercício dos direitos previstos no <strong>mecanismo do Artigo 18 da LGPD</strong>.
          </p>

          {/* Transparency Accordions (Art. 18, I, II & III) */}
          <div className="space-y-2">
            {[
              {
                title: "Como o OffMe protege meus dados pessoais?",
                content: "Todos os dados de perfil vinculados à sua conta são armazenados de forma blindada utilizando infraestrutura certificada do Google Cloud Platform (GCP Region US-East) sob regras de segurança em nível de banco de dados (Firestore SecRules) que impossibilitam vazamentos ou acessos arbitrários. Ninguém tem acesso aos seus metadados de autenticação.",
                icon: ShieldAlert
              },
              {
                title: "Quem é o Controlador de Dados & Encarregado (DPO)?",
                content: "O controlador e encarregado de dados no OffMe é o time OffMe Community Labs. Para exercer direitos ou enviar comunicações legais, você pode acionar a assessoria jurídica diretamente no e-mail de suporte privacidade@offme.app ou no suporte klypsocialofficial@gmail.com.",
                icon: Info
              },
              {
                title: "Quais bases legais a plataforma utiliza?",
                content: "Operamos sob as seguintes bases: Consentimento do Titular (Art. 7º, I) para ajustes e mídias do perfil; Execução de Contratos ou Termos (Art. 7º, V) para carregar feeds, conversas criptografadas de dm e sistemas de gamificação; e Legítimo Interesse (Art. 7º, IX) para aplicar mecanismos anti-fraude e de denúncias.",
                icon: FileText
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-gray-50/50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all text-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                  className="w-full px-4 py-3.5 flex items-center justify-between font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <faq.icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{faq.title}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activeAccordion === idx ? 'rotate-95' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {activeAccordion === idx && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10"
                    >
                      <p className="p-4 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                        {faq.content}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Interactive LGPD Control Actions Panel (Art. 18 Active Rights) */}
          <div className="p-4 bg-blue-50/10 dark:bg-zinc-900 border border-blue-500/10 dark:border-zinc-800 rounded-3xl space-y-4">
            <span className="text-[10px] uppercase font-black tracking-wider text-blue-500 bg-blue-500/10 border border-blue-550/10 px-3 py-1 rounded-full inline-block">
              Ações de Direitos LGPD
            </span>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {/* Confirmação e Acesso (Art. 18, I e II) */}
              <button
                type="button"
                onClick={() => setIsLgpdDataOpen(true)}
                className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-950 hover:bg-gray-50 border border-black/5 dark:border-white/5 text-left transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black dark:text-white">Confirmação e Acesso</h4>
                    <p className="text-[10px] text-gray-400">Ver todas as variáveis do seu banco de dados.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Download de Dados (Portabilidade - Art. 18, V) */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-950 hover:bg-gray-50 border border-black/5 dark:border-white/5 text-left transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Download className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black dark:text-white">Fazer Portabilidade (JSON)</h4>
                    <p className="text-[10px] text-gray-400">Exportar todos os dados cadastrais em formato legal.</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Revogar Consentimento (Art. 18, IX) */}
              <button
                type="button"
                onClick={handleRevokeConsent}
                className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-950 hover:bg-gray-50 border border-black/5 dark:border-white/5 text-left transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl transition-all ${consentRevoked ? 'bg-amber-500 border border-amber-500 text-white' : 'bg-amber-500/10'}`}>
                    <RotateCcw className={`w-5 h-5 ${consentRevoked ? 'text-white' : 'text-amber-500'}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black dark:text-white">Revogar Consentimento</h4>
                    <p className="text-[10px] text-gray-400">Descartar preferências de rastros de cache analítico.</p>
                  </div>
                </div>
                {consentRevoked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              {/* Eliminação de Dados (Direito à exclusão física - Art. 18, VI) */}
              <button
                type="button"
                onClick={() => {
                  setLgpdConfirmUsername('');
                  setIsLgpdDeleteOpen(true);
                }}
                className="w-full p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-550/10 text-left transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-500">Eliminar Meus Dados</h4>
                    <p className="text-[10px] text-red-400">Apagar conta e posts definitivamente sob amparo da lei.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MODAL: Art 18, I e II - CONFIRMAÇÃO E ACESSO AOS DADOS */}
      <AnimatePresence>
        {isLgpdDataOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full sm:max-w-md bg-white dark:bg-zinc-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-black/5 dark:border-white/5"
            >
              <div className="flex justify-between items-center pb-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <h3 className="font-black text-black dark:text-white text-sm">Seus Dados no OffMe</h3>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-extrabold">LGPD Artigo 18, II - Acesso</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLgpdDataOpen(false)}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                <p className="text-[10px] text-gray-400 leading-normal mb-1">
                  Enquanto controlador de dados, declaramos as seguintes variáveis vinculadas ao seu ID no banco de dados ativo:
                </p>

                {[
                  { label: "ID do Registro (UID GDN)", value: userProfile?.uid || 'anon-id' },
                  { label: "Nome de Exibição", value: userProfile?.displayName || 'Sem nome' },
                  { label: "Nickname (@)", value: `@${userProfile?.username || 'user'}` },
                  { label: "E-mail de Cadastro", value: userProfile?.email || 'N/A' },
                  { label: "Status da Conta", value: userProfile?.isVerified ? "Autenticada / Verificada" : "Comum" },
                  { label: "Assinatura Elite", value: userProfile?.isPremium ? `Ativa (${userProfile?.premiumTier?.toUpperCase()})` : "Inativa" },
                  { label: "Pontos Estelares", value: `${userProfile?.points || 0} pts` },
                  { label: "Contas que te seguem", value: `${userProfile?.followers?.length || 0} usuários` },
                  { label: "Contas que você segue", value: `${userProfile?.following?.length || 0} usuários` },
                  { label: "Modo de Visibilidade", value: settings.privateProfile ? "Modo Privado" : "Feed Geral Público" },
                  { label: "Criação da Conta", value: formatLgpdDate(userProfile?.createdAt) }
                ].map((item, k) => (
                  <div key={k} className="p-3 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide mb-1">{item.label}</span>
                    <span className="text-xs font-mono font-bold text-black dark:text-zinc-200 truncate">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Copy Raw Metadata */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(userProfile, null, 2));
                    if (showToast) {
                      showToast("Metadados copiados para a área de transferência!", "success");
                    }
                  }}
                  className="w-full py-4.5 bg-blue-500 hover:bg-blue-600 transition-all text-xs font-black tracking-widest text-white uppercase rounded-[1.75rem]"
                >
                  COPIAR RAW METADADOS (JSON)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Art 18, VI - ELIMINAÇÃO GRAVE E PERMANENTE DE DADOS */}
      <AnimatePresence>
        {isLgpdDeleteOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full sm:max-w-md bg-white dark:bg-zinc-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-black/5 dark:border-white/5 text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <h3 className="font-black text-red-500 text-sm">Eliminação Física (Art. 18, VI)</h3>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-extrabold">Aviso legal irreversible</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLgpdDeleteOpen(false)}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* WARNING BOARD */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 text-xs">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 leading-normal">
                  <strong>CUIDADO: ESTA OPERAÇÃO É DEFINITIVA!</strong>
                  <p className="mt-1.5">
                    De acordo com a Lei 13.709/18, você está solicitando a eliminação total de todos os dados pessoais sob o nosso amparo. Nossos servidores irão realizar um expurgo irreversível de:
                  </p>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Seu cadastro de usuário e credenciais de login.</li>
                    <li>Todas as publicações de feed (posts e reposts).</li>
                    <li>Sua lista de amizades, histórico de pontuação, badges e moedas.</li>
                    <li>Toda e qualquer mídia armazenada na nuvem.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Escreva seu nome de usuário exato para confirmar:
                  </label>
                  <input
                    type="text"
                    value={lgpdConfirmUsername}
                    onChange={(e) => setLgpdConfirmUsername(e.target.value)}
                    placeholder={userProfile?.username || "seu-usuario"}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl outline-none text-xs font-mono font-bold uppercase tracking-widest text-black dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                    Ao confirmar, o aplicativo irá fechar automaticamente sua sessão e processar a destruição completa do registro do usuário `{userProfile?.username}`.
                  </p>
                </div>
              </div>

              {/* Action trigger */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccountConfirm}
                  disabled={loading || lgpdConfirmUsername !== userProfile?.username}
                  className="w-full py-4 bg-red-550 hover:bg-red-650 transition-all text-xs font-black tracking-widest text-white uppercase rounded-[1.75rem] disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>EXPURGAR REGISTROS E DELETAR CONTA</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLgpdDeleteOpen(false)}
                  className="w-full py-4.5 bg-gray-100 dark:bg-zinc-850 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all text-xs font-black tracking-widest uppercase rounded-[1.75rem]"
                >
                  CANCELAR PROCEDIMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
