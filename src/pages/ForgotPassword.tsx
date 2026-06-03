import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, CheckCircle2, AlertCircle, Ghost, ArrowLeft } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      let emailToSend = identifier;
      
      // If it doesn't look like an email, assume it's a username
      if (!identifier.includes('@')) {
        const q = query(collection(db, 'users'), where('username', '==', identifier.replace(/^@/, '')));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error("Usuário não encontrado.");
        }
        
        emailToSend = snapshot.docs[0].data().email;
      }
      
      await resetPassword(emailToSend);
      setSuccess('E-mail de redefinição de senha enviado. Verifique sua caixa de entrada e a pasta de spam.');
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/user-not-found') {
        message = 'Usuário não encontrado.';
      }
      setError('Falha ao enviar: ' + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-white transition-colors">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px]" />
      
      <div className="max-w-md w-full space-y-8 liquid-glass p-8 sm:p-10 rounded-[2rem] z-10 relative">
        <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para o login
        </Link>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white shadow-xl shadow-black/20 mb-4">
            <Ghost className="w-8 h-8" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Esqueceu a senha?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite seu e-mail ou nome de usuário e enviaremos um link para você redefinir sua senha.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {!success && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="identifier" className="sr-only">Email ou Nome de Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                    placeholder="Email ou Nome de Usuário"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-2xl text-white bg-black/90 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Enviar link de redefinição
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
