import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  useEffect(() => {
    if (!mode || !actionCode) {
      setStatus('error');
      setMessage('Link inválido ou expirado.');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'resetPassword':
            // Verify the code first
            setStatus('loading');
            const email = await verifyPasswordResetCode(auth, actionCode);
            setCustomEmail(email);
            setStatus('idle');
            break;
          case 'recoverEmail':
            // Need to implement email recovery if needed
            setStatus('loading');
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('Email restaurado com sucesso! Recomendamos que você altere sua senha imediatamente.');
            break;
          case 'verifyEmail':
            setStatus('loading');
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('Seu email foi verificado com sucesso!');
            break;
          default:
            setStatus('error');
            setMessage('Ação não suportada.');
        }
      } catch (error: any) {
        console.error('Auth action error:', error);
        setStatus('error');
        setMessage(error.message || 'Ocorreu um erro ao processar sua solicitação. O link pode ter expirado.');
      }
    };

    handleAction();
  }, [mode, actionCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCode) return;
    
    if (newPassword.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setStatus('loading');
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setStatus('success');
      setMessage('Sua senha foi redefinida com sucesso! Você já pode fazer login com a nova senha.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      setStatus('error');
      setMessage('Erro ao redefinir a senha. O link pode ter expirado.');
    }
  };

  return (
    <div className="min-h-screen bg-white/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-3xl font-black tracking-tighter text-gray-900">
          OffMe
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-black/5">
          {status === 'loading' && mode !== 'resetPassword' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 text-black animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Processando...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sucesso</h3>
              <p className="text-gray-600 mb-8">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-black text-white rounded-xl py-3 font-bold hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ops, algo deu errado</h3>
              <p className="text-gray-600 mb-8">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-black text-white rounded-xl py-3 font-bold hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                Voltar
              </button>
            </div>
          )}

          {mode === 'resetPassword' && status !== 'success' && status !== 'error' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Nova Senha</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Defina uma nova senha para {customEmail}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-0 text-gray-900 rounded-xl focus:ring-2 focus:ring-black transition-all"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>

                {message && status === 'idle' && (
                  <p className="text-sm text-red-500 font-medium">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Redefinir Senha'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
