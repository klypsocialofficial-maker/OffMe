import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ArrowLeft, ShieldCheck, HelpCircle, CheckCircle, Smartphone, Copy, Check } from 'lucide-react';

export default function PremiumCheckoutSimulation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();
  
  const userId = searchParams.get('userId') || userProfile?.uid;
  const tier = searchParams.get('tier') || 'gold';

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('12/29');
  const [cvv, setCvv] = useState('123');
  const [isPaying, setIsPaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState(2500);

  // Sync cardholder name with display name
  useEffect(() => {
    if (userProfile?.displayName) {
      setCardName(userProfile.displayName.toUpperCase());
    }
  }, [userProfile?.displayName]);

  // Adjust details based on tier
  let planName = 'OffMe Fun Gold';
  let price = 'R$ 19,90';
  let giftPoints = 2500;
  
  if (tier === 'silver') {
    planName = 'OffMe Básico Prata';
    price = 'R$ 9,90';
    giftPoints = 500;
  } else if (tier === 'black') {
    planName = 'OffMe Business Black';
    price = 'R$ 49,90';
    giftPoints = 10000;
  }

  const handleCopyPix = () => {
    const pixCode = "00020101021126580014br.gov.bcb.pix0136e05d04cc-b8bf-4c7b-b3ae-ca53b9f42fb7520400005303986540519.905802BR5915OffMe_Community6009Sao_Paulo62070503***6304ED2B";
    navigator.clipboard.writeText(pixCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmSimulation = async () => {
    if (!userId) {
      setError('ID de usuário não encontrado para a ativação.');
      return;
    }

    setIsPaying(true);
    setError('');

    try {
      const response = await fetch('/api/activate-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao simular aprovação do pagamento.');
      }

      setAwardedPoints(data.awardedPoints || giftPoints);
      setSuccess(true);

      // Brief pause to display our highly satisfying success screen before redirecting
      setTimeout(() => {
        navigate('/premium?success=true');
      }, 3500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado.');
      setIsPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Conectando ao terminal financeiro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-20 relative overflow-x-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-indigo-950/40 via-slate-950/10 to-transparent pointer-events-none z-0" />
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 px-4 pt-12 pb-6 max-w-lg mx-auto flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.25em] text-white/50 italic">OffMe Gateway</span>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4">
        
        {/* Success Transition Block */}
        <AnimatePresence>
          {success ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
            >
              {/* Confetti Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent -z-10" />
              
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.2 }}
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>
              </div>

              <h2 className="text-2xl font-black tracking-tight mb-2">PAGAMENTO CONFIRMADO!</h2>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
                Nossa verificação de teste aprovou sua solicitação. Seus benefícios do plano <span className="font-bold text-white uppercase tracking-wider">{planName}</span> foram carregados!
              </p>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left mb-6">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                  <span>Prêmio de Ativação</span>
                  <span className="text-emerald-400 font-bold">GANHOU!</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-200">Pontos Estelares Adicionados</span>
                  <span className="text-xl font-black text-amber-400">+{awardedPoints} pts</span>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Ativando sua credencial de elite...</span>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              
              {/* Subscription Summary */}
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                      SANDBOX DE TESTE
                    </span>
                    <h2 className="text-xl font-black italic tracking-tight mt-3 text-white">
                      {planName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Conquistando distinção e benefícios VIP</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tight text-white">{price}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Pagamento Anual Fictício</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-400">
                  <span>Crédito Estelar de Boas-Vindas:</span>
                  <span className="font-extrabold text-amber-400">+{giftPoints} pts</span>
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center space-x-2 ${
                    paymentMethod === 'card' 
                      ? 'bg-white/10 text-white shadow-inner border border-white/15' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center space-x-2 ${
                    paymentMethod === 'pix' 
                      ? 'bg-white/10 text-white shadow-inner border border-white/15' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pix</span>
                </button>
              </div>

              {/* Card Method */}
              {paymentMethod === 'card' && (
                <div className="space-y-6">
                  {/* Visual Premium Credit Card */}
                  <div className="relative aspect-[1.586/1] w-full rounded-2xl overflow-hidden p-6 shadow-2xl flex flex-col justify-between border border-white/20 select-none">
                    {/* Glow Accents based on Plan */}
                    {tier === 'silver' ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-800 to-zinc-950 -z-10" />
                    ) : tier === 'black' ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-zinc-950 to-black -z-10" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-600/85 via-yellow-900/60 to-slate-950 -z-10" />
                    )}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.04] rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-extrabold tracking-[0.25em] text-white/50 uppercase">OFFME MEMBRO ELITE</p>
                        <p className="text-xs font-bold tracking-wide mt-1 text-amber-400 uppercase">
                          {tier === 'silver' ? 'Silver Member' : tier === 'black' ? 'Business Black' : 'Gold Partner'}
                        </p>
                      </div>
                      <div className="w-10 h-7 bg-white/10 rounded-md border border-white/10 flex items-center justify-center font-bold text-xs text-white/40">
                        SIM
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Chip & Number */}
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-7 rounded bg-gradient-to-r from-yellow-300 to-amber-500 opacity-60 flex-shrink-0 shadow shadow-amber-500/20" />
                        <p className="text-lg sm:text-xl font-mono tracking-[0.14em] text-white font-medium">
                          {cardNumber}
                        </p>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="max-w-[70%]">
                          <p className="text-[8px] tracking-wider text-white/40 uppercase">Titular do Cartão</p>
                          <p className="text-xs font-mono font-bold tracking-wider text-white truncate">
                            {cardName || 'Membro do OffMe'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] tracking-wider text-white/40 uppercase text-right">Validade</p>
                          <p className="text-xs font-mono font-bold text-white text-right">{expiry}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form inputs */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                        Preencher Automático de Teste
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber('4000 1234 5678 9010');
                          setExpiry('12/29');
                          setCvv('123');
                          if (userProfile?.displayName) {
                            setCardName(userProfile.displayName.toUpperCase());
                          }
                        }}
                        className="w-full py-2.5 bg-white/10 rounded-xl hover:bg-white/15 transition-all text-xs font-extrabold text-blue-400 hover:text-blue-300 border border-white/5 flex items-center justify-center space-x-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Preencher dados fictícios seguros</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-1">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                          Nome do Titular
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          placeholder="DIGITE COMO NO CARTÃO"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            Validade
                          </label>
                          <input
                            type="text"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            Cód. Segurança (CVV)
                          </label>
                          <input
                            type="text"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white/10 transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pix Method */}
              {paymentMethod === 'pix' && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                    QR CODE DE TESTE FICTÍCIO
                  </span>
                  
                  {/* Simulated QR Code Iconography */}
                  <div className="w-48 h-48 bg-white rounded-2xl p-4 flex flex-col items-center justify-center relative border-4 border-amber-500/20 shadow-xl mb-4 group select-none">
                    <div className="absolute inset-0 bg-slate-900/10 pointer-events-none z-10" />
                    {/* Abstract Grid representing a QR Code */}
                    <div className="grid grid-cols-4 gap-2 w-full h-full opacity-80">
                      {[1,0,1,1, 0,1,0,0, 1,0,1,0, 1,1,1,1].map((dot, k) => (
                        <div 
                          key={k} 
                          className={`rounded ${
                            dot === 1 
                              ? 'bg-slate-950 border border-slate-800' 
                              : 'bg-transparent'
                          } ${(k === 0 || k === 3 || k === 12 || k === 15) ? 'border-4 border-slate-950 scale-105' : ''}`}
                        />
                      ))}
                    </div>
                    {/* Centered logo icon overlay */}
                    <div className="absolute inset-x-0 mx-auto w-10 h-10 bg-black rounded-xl border-2 border-white flex items-center justify-center z-20">
                      <span className="font-extrabold italic text-[9px] text-amber-500">OffMe</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 text-center max-w-xs mb-6">
                    Aponte seu app bancário fictício para escanear a simulação de transação ou copie o código Pix abaixo.
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full py-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs font-black tracking-wide flex items-center justify-center space-x-2"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">PIX COPIADO!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-300" />
                        <span>COPIAR CHAVE PIX</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Secure Info Prompt */}
              <div className="flex items-start space-x-3 opacity-60 text-[10px] text-slate-400 leading-normal px-2">
                <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  Esta é uma simulação autenticada desenvolvida estritamente para o ambiente de testes do OffMe. Nenhuma cobrança real será efetuada em seu cartão de crédito ou conta bancária.
                </p>
              </div>

              {/* Error messages */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl font-medium">
                  {error}
                </div>
              )}

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={handleConfirmSimulation}
                disabled={isPaying}
                className="w-full py-5 rounded-[2rem] bg-amber-500 text-slate-950 hover:bg-amber-400 font-black tracking-widest text-xs uppercase shadow-xl shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {isPaying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                    <span>PROCESSANDO TRANSAÇÃO COGNITIVA...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRMAR PAGAMENTO SEGURO</span>
                  </>
                )}
              </button>

            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
