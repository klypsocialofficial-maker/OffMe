import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, XCircle, 
  Flag, ShieldCheck, User as UserIcon, Trash2, 
  ExternalLink, Eye, Filter, Search, MoreVertical 
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import LazyImage from '../components/LazyImage';
import VerifiedBadge from '../components/VerifiedBadge';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'reports' | 'verification'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleResolveReport = async (reportId: string, action: 'dismissed' | 'approved') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: action, resolvedAt: new Date() });
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
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-gray-200">
           <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'reports' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
           >
             <Flag className="w-4 h-4" />
             <span>Denúncias ({reports.filter(r => r.status === 'pending').length})</span>
           </button>
           <button 
            onClick={() => setActiveTab('verification')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'verification' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
            }`}
           >
             <ShieldCheck className="w-4 h-4" />
             <span>Verificações ({verifications.filter(v => v.status === 'pending').length})</span>
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
                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200"
                           >
                              Ignorar
                           </button>
                           <button 
                            onClick={() => handleResolveReport(report.id, 'approved')}
                            className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                           >
                              Punição
                           </button>
                        </div>
                      )}
                   </div>
                </motion.div>
              ))
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
