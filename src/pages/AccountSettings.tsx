import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, Save, AlertCircle, CheckCircle, Trash2, ShieldCheck, Clock, ShieldAlert, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';
import VerificationRequestModal from '../components/VerificationRequestModal';
import { formatFullDate } from '../lib/dateUtils';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { userProfile, updateUserEmail, updateUserPassword, updateUserUsername, deleteAccount } = useAuth();
  
  const [username, setUsername] = useState(userProfile?.username || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [showViolations, setShowViolations] = useState(false);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === userProfile?.username) return;
    
    setLoading(true);
    setStatus(null);
    try {
      await updateUserUsername(username);
      setStatus({ type: 'success', message: 'Nome de usuário atualizado com sucesso!' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Erro ao atualizar nome de usuário.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === userProfile?.email) return;

    setLoading(true);
    setStatus(null);
    try {
      await updateUserEmail(email);
      setStatus({ type: 'success', message: 'E-mail atualizado com sucesso!' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', message: 'Esta operação requer um login recente. Por favor, saia e entre novamente.' });
      } else {
        setStatus({ type: 'error', message: error.message || 'Erro ao atualizar e-mail.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      await updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setStatus({ type: 'success', message: 'Senha atualizada com sucesso!' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', message: 'Esta operação requer um login recente. Por favor, saia e entre novamente.' });
      } else {
        setStatus({ type: 'error', message: error.message || 'Erro ao atualizar senha.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', message: 'Esta operação requer um login recente. Por favor, saia e entre novamente.' });
      } else {
        setStatus({ type: 'error', message: error.message || 'Erro ao deletar conta.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-white/50 overflow-y-auto pb-20">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Informações da conta</h1>
        </div>
      </div>
      <div className="p-4">

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-6 flex items-center space-x-3 ${
            status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{status.message}</p>
        </motion.div>
      )}

      <div className="space-y-8">
        {/* Account Info Card */}
        <section className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[32px] shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter mb-1">@{userProfile?.username}</h2>
            <p className="text-white/70 text-sm font-bold uppercase tracking-widest flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              Membro desde {formatFullDate(userProfile?.createdAt?.toDate ? userProfile.createdAt.toDate() : null)}
            </p>
          </div>
        </section>

        {/* Security & Rules Status */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <h2 className="font-bold text-gray-900">Estado da conta</h2>
            </div>
            <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
              Regular
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-black/5 shadow-sm">
                  <ShieldAlert className={`w-5 h-5 ${userProfile?.violations?.length ? 'text-amber-500' : 'text-green-500'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Violação de regras</p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.violations?.length 
                      ? `${userProfile.violations.length} incidente(s) registrado(s)` 
                      : 'Nenhuma violação encontrada'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowViolations(!showViolations)}
                className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-600"
              >
                {showViolations ? 'Fechar' : 'Detalhes'}
              </button>
            </div>

            <AnimatePresence>
              {showViolations && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mt-2 space-y-3">
                    {userProfile?.violations && userProfile.violations.length > 0 ? (
                      userProfile.violations.map((v, i) => (
                        <div key={v.id || i} className="flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">{v.reason}</p>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              v.severity === 'high' ? 'bg-red-100 text-red-600' : 
                              v.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 
                              'bg-indigo-100 text-indigo-600'
                            }`}>
                              {v.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">{formatFullDate(v.date?.toDate ? v.date.toDate() : null)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <CheckCircle className="w-8 h-8 text-green-200 mb-2" />
                        <p className="text-xs text-gray-500 font-medium text-center px-4">
                          Sua conta está em conformidade com as diretrizes da comunidade. Continue sendo um fantasma exemplar!
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-black/5 shadow-sm">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Termos de uso</p>
                <p className="text-xs text-gray-500">Última atualização em 12 de Out 2023</p>
              </div>
            </div>
          </div>
        </section>

        {/* Username Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">Nome de usuário</h2>
          </div>
          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-8 pr-4 outline-none focus:ring-2 focus:ring-black transition-all"
                  placeholder="seu_username"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading || username === userProfile?.username || !username.trim()}
              className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar alterações</span>
            </button>
          </form>
        </section>

        {/* Email Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">E-mail</h2>
          </div>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Endereço de e-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="seu@email.com"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || email === userProfile?.email || !email.trim()}
              className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Atualizar e-mail</span>
            </button>
          </form>
        </section>

        {/* Password Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">Alterar senha</h2>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nova senha</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Confirmar nova senha</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !newPassword || newPassword.length < 6}
              className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Alterar senha</span>
            </button>
          </form>
        </section>

        {/* Danger Zone Section */}
        <section className="bg-red-50/50 p-6 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center space-x-2 mb-4">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-900">Zona de perigo</h2>
          </div>
          <p className="text-sm text-red-600 mb-6 leading-relaxed">
            Ao deletar sua conta, todos os seus dados de perfil serão removidos permanentemente. Esta ação não pode ser desfeita.
          </p>
          <button 
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Deletar minha conta</span>
          </button>
        </section>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Deletar conta?"
        message="Tem certeza que deseja deletar sua conta? Todos os seus dados de perfil serão removidos permanentemente e você perderá acesso a esta conta. Esta ação não pode ser desfeita."
        confirmText="Sim, deletar conta"
        cancelText="Cancelar"
        type="danger"
      />
      <VerificationRequestModal 
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
      </div>
    </div>
  );
}
