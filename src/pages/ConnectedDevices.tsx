import React, { useEffect, useState } from 'react';
import { ArrowLeft, Laptop, Smartphone, Globe, Clock, ShieldCheck, ShieldAlert, LogOut, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';

interface Session {
  id: string;
  browser: string;
  os: string;
  userAgent: string;
  ip: string;
  location: string;
  loginAt: any;
  lastActive: any;
  isCurrent?: boolean;
}

export default function ConnectedDevices() {
  const navigate = useNavigate();
  const { userProfile, showToast } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!userProfile?.uid || !db) {
      setLoading(false);
      return;
    }

    const currentSessionId = localStorage.getItem('offme_session_id');
    const sessionsRef = collection(db, 'users', userProfile.uid, 'sessions');
    
    // Listen to sessions collection sorted by loginTime or lastActive
    const q = query(sessionsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeSessions: Session[] = [];
      snapshot.forEach((snapDoc) => {
        const item = snapDoc.data();
        activeSessions.push({
          id: snapDoc.id,
          browser: item.browser || 'Navegador',
          os: item.os || 'Dispositivo',
          userAgent: item.userAgent || '',
          ip: item.ip || '0.0.0.0',
          location: item.location || 'Localização desconhecida',
          loginAt: item.loginAt,
          lastActive: item.lastActive,
          isCurrent: snapDoc.id === currentSessionId
        });
      });

      // Sort current device first, then by last active description
      activeSessions.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        
        // Use last active timestamps or normal fallback
        const aTime = a.lastActive?.toDate ? a.lastActive.toDate().getTime() : 0;
        const bTime = b.lastActive?.toDate ? b.lastActive.toDate().getTime() : 0;
        return bTime - aTime;
      });

      setSessions(activeSessions);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, `users/${userProfile.uid}/sessions`);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handleRevokeSession = async () => {
    if (!userProfile?.uid || !revokeTarget) return;
    setRevoking(true);
    try {
      const sessionDocRef = doc(db, 'users', userProfile.uid, 'sessions', revokeTarget.id);
      await deleteDoc(sessionDocRef);
      showToast('Sessão encerrada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao encerrar sessão remotamente.', 'error');
      handleFirestoreError(err, OperationType.DELETE, `users/${userProfile.uid}/sessions/${revokeTarget.id}`);
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const getDeviceIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('iphone') || osLower.includes('android') || osLower.includes('phone') || osLower.includes('mobile')) {
      return <Smartphone className="w-6 h-6 text-indigo-500" />;
    }
    return <Laptop className="w-6 h-6 text-blue-500" />;
  };

  const formatSessionTime = (timestamp: any) => {
    if (!timestamp) return 'Ativo agora';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Safe format Portuguese
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ativo agora';
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full h-full bg-white/50 pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-[150] bg-white/95 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter">Dispositivos Conectados</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Intro banner */}
        <section className="bg-gradient-to-r from-red-500/10 to-indigo-500/10 p-5 rounded-3xl border border-dashed border-red-500/25 flex items-start space-x-4">
          <div className="w-10 h-10 bg-white/80 backdrop-blur-xl shrink-0 rounded-2xl flex items-center justify-center border border-black/5 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Segurança de sua conta</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Aqui você pode gerenciar todas as sessões ativas que acessaram sua conta do OffMe. Caso não reconheça algum dispositivo, clique em <strong>Encerrar sessão</strong> para desconectá-lo imediatamente por motivos de segurança.
            </p>
          </div>
        </section>

        {/* List of sessions */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">Sessões ativas ({sessions.length})</h2>
            {loading && <div className="border-2 border-indigo-600 border-t-transparent w-4 h-4 rounded-full animate-spin"></div>}
          </div>

          {sessions.length === 0 && !loading ? (
            <div className="text-center py-12 space-y-3">
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-medium text-gray-500">Nenhuma sessão encontrada ou banco offline.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div key={session.id} className="py-5 first:pt-0 last:pb-0 flex items-start justify-between space-x-4">
                  <div className="flex space-x-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
                      {getDeviceIcon(session.os)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900 leading-tight">
                          {session.browser} em {session.os}
                        </span>
                        
                        {session.isCurrent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                            Este dispositivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            Sessão ativa
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1 col-span-2">
                        <div className="flex items-center text-xs text-gray-400 gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-gray-300" />
                          <span>{session.location} ({session.ip})</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-300" />
                          <span>Visto pela última vez: {formatSessionTime(session.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => setRevokeTarget(session)}
                      disabled={revoking}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex-shrink-0"
                      title="Desconectar sessão remotamente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeSession}
        title="Encerrar sessão remota?"
        message={`Deseja realmente desconectar esta sessão de ${revokeTarget?.browser} em ${revokeTarget?.os} (${revokeTarget?.location})? O dispositivo correspondente será deslogado instantaneamente de sua conta por segurança.`}
        confirmText={revoking ? 'Encerrando...' : 'Sim, desconectar'}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
