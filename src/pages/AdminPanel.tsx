import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, XCircle, 
  Flag, ShieldCheck, User as UserIcon, Trash2, 
  ExternalLink, Eye, Filter, Search, MoreVertical 
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDoc, arrayUnion, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import LazyImage from '../components/LazyImage';
import VerifiedBadge from '../components/VerifiedBadge';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'reports' | 'verification' | 'users'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserForMod, setSelectedUserForMod] = useState<any>(null);
  const [violationReason, setViolationReason] = useState('');
  const [violationSeverity, setViolationSeverity] = useState<'low' | 'medium' | 'high'>('low');

  // Security check: only klypsocialofficial@gmail.com is allowed
  const isAdmin = userProfile?.email === 'klypsocialofficial@gmail.com';

  useEffect(() => {
    if (!isAdmin || !db) return;

    const reportsQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const verifyQ = query(collection(db, 'verificationRequests'), orderBy('createdAt', 'desc'));

    const unsubReports = onSnapshot(reportsQ, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubVerify = onSnapshot(verifyQ, (snap) => {
      setVerifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubReports();
      unsubVerify();
    };
  }, [isAdmin]);

  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    setIsSearchingUsers(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', userSearchQuery.toLowerCase()),
        where('username', '<=', userSearchQuery.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);
      setUserResults(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddViolation = async (userId: string, reason: string, severity: 'low' | 'medium' | 'high') => {
    try {
      const violation = {
        id: Math.random().toString(36).substr(2, 9),
        reason,
        severity,
        date: new Date(),
        type: 'moderation'
      };
      await updateDoc(doc(db, 'users', userId), {
        violations: arrayUnion(violation)
      });
      alert('Violação registrada com sucesso!');
      setViolationReason('');
      setSelectedUserForMod(null);
    } catch (error) {
      console.error('Error adding violation:', error);
    }
  };

  const handleResolveReport = async (report: any, action: 'dismissed' | 'approved') => {
    try {
      await updateDoc(doc(db, 'reports', report.id), { status: action, resolvedAt: new Date() });
      
      if (action === 'approved') {
        // If it's a user report, add a violation automatically
        const targetUid = report.targetType === 'user' ? report.targetId : null;
        if (targetUid) {
          await handleAddViolation(targetUid, `Reportado por: ${report.reason}`, 'medium');
        }
      }
    } catch (error) {
      console.error('Error resolving report:', error);
    }
  };

  const handleVerify = async (requestId: string, uid: string, status: 'accepted' | 'declined') => {
    try {
       const batch = writeBatch(db);
       batch.update(doc(db, 'verificationRequests', requestId), { status, resolvedAt: new Date() });
       
       if (status === 'accepted') {
         batch.update(doc(db, 'users', uid), { 
           isVerified: true,
           premiumTier: 'silver' // Award silver tier automatically on verification
         });
       }
       
       await batch.commit();
    } catch (error) {
      console.error('Error verifying user:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80dvh] p-8 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black italic tracking-tighter mb-2">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissões administrativas para acessar esta área.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-black text-white rounded-full font-bold">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 pt-safe px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-none">Painel Administrativo</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Staff Mod Cloud</p>
          </div>
        </div>
        <ShieldAlert className="w-6 h-6 text-red-500" />
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Tabs */}
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-gray-200 overflow-x-auto no-scrollbar">
           <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
           >
             <Flag className="w-4 h-4" />
             <span>Denúncias ({reports.filter(r => r.status === 'pending').length})</span>
           </button>
           <button 
            onClick={() => setActiveTab('verification')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'verification' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
           >
             <ShieldCheck className="w-4 h-4" />
             <span>Verificações ({verifications.filter(v => v.status === 'pending').length})</span>
           </button>
           <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'users' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
           >
             <UserIcon className="w-4 h-4" />
             <span>Usuários</span>
           </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Carregando dados...</div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'reports' ? (
              reports.length === 0 ? (
                <div className="py-20 text-center text-gray-500 bg-white rounded-3xl border border-dashed border-gray-200">Nenhuma denúncia no momento.</div>
              ) : reports.map(report => (
                <motion.div 
                  key={report.id} 
                  layout
                  className={`bg-white p-5 rounded-3xl border shadow-sm transition-all ${
                    report.status !== 'pending' ? 'opacity-60 grayscale' : 'border-gray-100 hover:shadow-md'
                  }`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                         <div className={`p-3 rounded-2xl ${report.status === 'pending' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                            <Flag className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="font-bold text-gray-900 leading-none">{report.reason}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Alvo: {report.targetType} · {report.targetId}</p>
                         </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                        report.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {report.status}
                      </span>
                   </div>
                   
                   {report.details && (
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 text-sm text-gray-600">
                        <span className="font-bold text-gray-900 block mb-1">Detalhes:</span>
                        {report.details}
                     </div>
                   )}

                   <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <button 
                        onClick={() => navigate(report.targetType === 'post' ? `/post/${report.targetId}` : `/${report.targetId}`)}
                        className="text-blue-500 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                         <Eye className="w-3.5 h-3.5" />
                         Ver Alvo
                      </button>
                                {report.status === 'pending' && (
                        <div className="flex space-x-2">
                           <button 
                            onClick={() => handleResolveReport(report, 'dismissed')}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200"
                           >
                              Ignorar
                           </button>
                           <button 
                            onClick={() => handleResolveReport(report, 'approved')}
                            className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                           >
                              Punição
                           </button>
                        </div>
                      )}
                   </div>
                </motion.div>
              ))
            ) : activeTab === 'verification' ? (
              verifications.length === 0 ? (
                <div className="py-20 text-center text-gray-500 bg-white rounded-3xl border border-dashed border-gray-200">Sem pedidos pendentes.</div>
              ) : verifications.map(req => (
                <motion.div 
                   key={req.id} 
                   layout
                   className={`bg-white p-5 rounded-3xl border shadow-sm transition-all ${
                    req.status !== 'pending' ? 'opacity-60 grayscale' : 'border-gray-100 hover:shadow-md'
                  }`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                         <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl font-bold text-xs">
                            {req.category?.charAt(0)}
                         </div>
                         <div>
                            <p className="font-bold text-gray-900 leading-none">{req.displayName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">@{req.username} · {req.category}</p>
                         </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                        req.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {req.status}
                      </span>
                   </div>

                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                      <p className="text-xs text-gray-400 font-bold mb-1 uppercase">Justificativa:</p>
                      <p className="text-sm text-gray-700">{req.reason}</p>
                   </div>

                   {req.documentUrl && (
                     <a href={req.documentUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-blue-500 text-xs font-bold mb-4 hover:underline">
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver Documento Comprobatório</span>
                     </a>
                   )}

                   <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <button 
                        onClick={() => navigate(`/${req.username}`)}
                        className="text-blue-500 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                         <Eye className="w-3.5 h-3.5" />
                         Ver Perfil
                      </button>
                      
                      {req.status === 'pending' && (
                        <div className="flex space-x-2">
                           <button 
                             onClick={() => handleVerify(req.id, req.uid, 'declined')}
                             className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200"
                           >
                              Recusar
                           </button>
                           <button 
                             onClick={() => handleVerify(req.id, req.uid, 'accepted')}
                             className="px-4 py-2 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                           >
                              Verificar
                           </button>
                        </div>
                      )}
                   </div>
                </motion.div>
              ))
            ) : (
              <div className="space-y-6">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                      placeholder="Buscar por @username..."
                      className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleSearchUsers}
                    disabled={isSearchingUsers}
                    className="px-6 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {isSearchingUsers ? '...' : 'Buscar'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userResults.map(user => (
                    <div key={user.uid} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                          <LazyImage src={user.photoURL} alt={user.displayName} className="w-full h-full" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.displayName}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUserForMod(user)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                      >
                        Moderar
                      </button>
                    </div>
                  ))}
                </div>

                {/* Moderation Modal */}
                <AnimatePresence>
                  {selectedUserForMod && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
                      >
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-black italic tracking-tighter">Punir @{selectedUserForMod.username}</h3>
                          <button onClick={() => setSelectedUserForMod(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 rotate-90" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo da violação</label>
                            <textarea 
                              value={violationReason}
                              onChange={(e) => setViolationReason(e.target.value)}
                              placeholder="Ex: Spam de link suspeito..."
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black h-24"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gravidade</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['low', 'medium', 'high'].map((sev) => (
                                <button 
                                  key={sev}
                                  onClick={() => setViolationSeverity(sev as any)}
                                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                    violationSeverity === sev 
                                      ? 'bg-black text-white border-black' 
                                      : 'bg-white text-gray-500 border-gray-200 hover:border-black'
                                  }`}
                                >
                                  {sev.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => handleAddViolation(selectedUserForMod.uid, violationReason, violationSeverity)}
                            disabled={!violationReason.trim()}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                          >
                            Aplicar Punição
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
