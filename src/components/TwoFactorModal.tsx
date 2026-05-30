import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ChevronRight, Lock, Eye, Copy, RefreshCw, CheckCircle, Smartphone, Sliders, Check, Clock, AlertTriangle, ArrowLeft, Download } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

export default function TwoFactorModal({ isOpen, onClose, userProfile }: TwoFactorModalProps) {
  const [step, setStep] = useState(0); // 0: Start, 1: Create PIN, 2: Confirm PIN, 3: Backup Codes, 4: Active/Dashboard
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCheck, setErrorCheck] = useState('');
  const [disableConfirmCode, setDisableConfirmCode] = useState('');

  // Is 2FA already active?
  const isAlreadyActive = userProfile?.twoFactorEnabled === true;

  useEffect(() => {
    if (isOpen) {
      if (isAlreadyActive) {
        setStep(4);
      } else {
        setStep(0);
        setPin('');
        setConfirmPin('');
        setErrorCheck('');
      }
    }
  }, [isOpen, isAlreadyActive]);

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 6; i++) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push(`OFFM-${part1}-${part2}`);
    }
    return codes;
  };

  const handleStartSetup = () => {
    setPin('');
    setConfirmPin('');
    setErrorCheck('');
    setStep(1);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setErrorCheck('O PIN deve conter exatamente 6 números.');
      return;
    }
    setErrorCheck('');
    setStep(2);
  };

  const handleConfirmPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPin !== pin) {
      setErrorCheck('Os PINs não coincidem. Tente novamente.');
      return;
    }

    setLoading(true);
    setErrorCheck('');
    try {
      const generatedCodes = generateBackupCodes();
      setBackupCodes(generatedCodes);
      
      if (userProfile?.uid && db) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          twoFactorEnabled: true,
          twoFactorPIN: pin,
          twoFactorBackupCodes: generatedCodes,
          twoFactorCreatedAt: new Date()
        });
      }
      setStep(3);
    } catch (err: any) {
      setErrorCheck('Erro ao salvar configurações de 2FA.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const text = `CÓDIGOS DE RECUPERAÇÃO OFFME (2FA)\n\nPIN de Segurança: ${pin}\n\nGuarde com cuidado:\n` + backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const text = `CÓDIGOS DE RECUPERAÇÃO OFFME (2FA)\n\nPIN de Segurança: ${pin}\n\nBackup Codes:\n` + backupCodes.join('\n') + `\n\nCriado em: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offme-backup-codes-${userProfile?.username || 'user'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disableConfirmCode !== userProfile?.twoFactorPIN) {
      setErrorCheck('PIN incorreto para desativação.');
      return;
    }

    setLoading(true);
    setErrorCheck('');
    try {
      if (userProfile?.uid && db) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          twoFactorEnabled: false,
          twoFactorPIN: null,
          twoFactorBackupCodes: null,
          twoFactorCreatedAt: null
        });
      }
      setDisableConfirmCode('');
      onClose();
    } catch (err) {
      setErrorCheck('Ocorreu um erro ao desativar o 2FA.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-zinc-900 rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-zinc-800 z-10 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800 mb-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-500" />
                <h3 className="font-black italic tracking-tighter text-lg text-gray-900 dark:text-white">
                  Autenticação Duas Etapas
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Error Bar */}
            {errorCheck && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                {errorCheck}
              </div>
            )}

            {/* Steps Container */}
            <div className="min-h-[250px] flex flex-col justify-between">
              
              {/* STEP 0: Explanatory Landing */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-6 flex flex-col items-center">
                    <Smartphone className="w-12 h-12 text-blue-500 mb-3 animate-pulse" />
                    <p className="text-gray-900 dark:text-white font-bold text-base">Proteja totalmente seu login</p>
                    <p className="text-gray-500 dark:text-zinc-400 text-xs mt-1 max-w-[280px]">
                      A autenticação em duas etapas adiciona uma camada extra de proteção contra acessos não autorizados.
                    </p>
                  </div>

                  <div className="space-y-3 bg-gray-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 text-xs text-gray-600 dark:text-zinc-300">
                    <div className="flex items-start space-x-2">
                      <Lock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <b className="text-gray-800 dark:text-white block font-bold">1. PIN Único</b>
                        Crie um PIN numérico secreto de 6 dígitos que será solicitado ao entrar no OffMe.
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Sliders className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <b className="text-gray-800 dark:text-white block font-bold">2. Códigos de Recuperação</b>
                        Receba códigos extras de uso único caso esqueça seu PIN.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSetup}
                    className="w-full bg-black dark:bg-white dark:text-black text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
                  >
                    Ativar agora
                  </button>
                </div>
              )}

              {/* STEP 1: Enter 6 Digit PIN */}
              {step === 1 && (
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Crie seu PIN de Segurança</h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                      Este PIN de 6 dígitos será cobrado após o e-mail e senha no seu login.
                    </p>
                    
                    <input
                      type="password"
                      maxLength={6}
                      pattern="\d*"
                      inputMode="numeric"
                      value={pin}
                      placeholder="Crie um PIN com 6 números"
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-2xl tracking-widest bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl py-4 font-mono font-bold outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all dark:text-white"
                      required
                    />
                    <div className="text-center text-[10px] text-gray-400 mt-2">
                      Apenas números. {pin.length}/6 dígitos
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={pin.length !== 6}
                    className="w-full bg-black dark:bg-white dark:text-black text-white py-3.5 rounded-2xl font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Próximo passo
                  </button>
                </form>
              )}

              {/* STEP 2: Confirm 6 Digit PIN */}
              {step === 2 && (
                <form onSubmit={handleConfirmPinSubmit} className="space-y-4">
                  <div>
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="text-xs text-blue-500 hover:underline mb-2 flex items-center gap-1 font-bold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Confirme seu PIN</h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                      Digite o PIN de 6 dígitos novamente para garantir que você digitou corretamente.
                    </p>
                    
                    <input
                      type="password"
                      maxLength={6}
                      pattern="\d*"
                      inputMode="numeric"
                      value={confirmPin}
                      placeholder="Confirme seu PIN"
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-2xl tracking-widest bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl py-4 font-mono font-bold outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all dark:text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || confirmPin.length !== 6}
                    className="w-full bg-black dark:bg-white dark:text-black text-white py-3.5 rounded-2xl font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Confirmar e Ativar 2FA</span>}
                  </button>
                </form>
              )}

              {/* STEP 3: Display Backup Codes */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="text-center py-2 flex flex-col items-center">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                    <p className="text-gray-900 dark:text-white font-bold text-sm">2FA Ativado com sucesso!</p>
                    <p className="text-gray-500 dark:text-zinc-400 text-xs mt-1">Guarde seus códigos de recuperação em local seguro:</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-700 font-mono text-xs dark:text-white font-bold text-center">
                    {backupCodes.map((code) => (
                      <div key={code} className="py-1 px-2 select-all bg-white dark:bg-zinc-900 rounded-md shadow-sm border border-black/5 dark:border-zinc-800">
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={copyBackupCodes}
                      className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-white text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar códigos'}
                    </button>
                    <button
                      onClick={downloadBackupCodes}
                      className="py-3 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Salvar como arquivo .txt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full bg-black dark:bg-white dark:text-black text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all font-sans"
                  >
                    Entendido e Concluído
                  </button>
                </div>
              )}

              {/* STEP 4: Active Mode Panel (Status) */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">O 2FA está ativo</h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Sua conta do OffMe está totalmente protegida por PIN.</p>
                    </div>
                  </div>

                  {/* Buttons for viewing backup codes again or removing protection */}
                  <div className="space-y-2 border-t border-b border-gray-100 dark:border-zinc-800 py-4 my-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1">
                      Painel de Controle
                    </div>
                    <button
                      onClick={() => {
                        setBackupCodes(userProfile?.twoFactorBackupCodes || []);
                        setPin(userProfile?.twoFactorPIN || '');
                        setStep(3);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center justify-between text-xs font-bold text-gray-800 dark:text-white"
                    >
                      <span className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-blue-500" />
                        <span>Ver códigos de recuperação instalados</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleDisable2FA} className="bg-red-50/50 dark:bg-red-950/10 p-4 border border-red-100/50 dark:border-red-950 rounded-2xl space-y-3">
                    <h5 className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">Desativar Autenticação 2FA</h5>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Será necessário digitar seu PIN de 6 dígitos configurado para desativar a segurança.
                    </p>
                    
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={6}
                        pattern="\d*"
                        inputMode="numeric"
                        placeholder="PIN ativo de 6 dígitos"
                        value={disableConfirmCode}
                        onChange={(e) => setDisableConfirmCode(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 text-xs font-mono tracking-widest font-bold px-3 py-2.5 rounded-xl outline-none focus:border-red-500 transition-all dark:text-white"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading || disableConfirmCode.length !== 6}
                        className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
