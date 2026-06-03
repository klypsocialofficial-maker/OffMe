import React, { useEffect, useState } from 'react';
import { Activity, RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SWDebug() {
  const [swState, setSwState] = useState<string>('Buscando...');
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkSW = async () => {
    setIsRefreshing(true);
    try {
      if (!('serviceWorker' in navigator)) {
        setSwState('Não suportado pelo navegador');
        return;
      }
      
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setSwState('Não registrado');
        return;
      }
      
      if (registration.installing) {
        setSwState('Instalando');
      } else if (registration.waiting) {
        setSwState('Aguardando atualização (waiting)');
      } else if (registration.active) {
        setSwState(`Ativo (running)`);
      } else {
        setSwState('Estado desconhecido');
      }
    } catch (e: any) {
      setSwState('Erro ao acessar SW');
      setErrorLogs(prev => [...prev, e.message || 'Erro desconhecido']);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkSW();
    const interval = setInterval(checkSW, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnregister = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const success = await registration.unregister();
          if (success) {
            setErrorLogs(prev => [...prev, 'Service Worker desregistrado com sucesso! Recarregue a página.']);
            checkSW();
          } else {
            setErrorLogs(prev => [...prev, 'Falha ao desregistrar Service Worker.']);
          }
        }
      } catch (e: any) {
        setErrorLogs(prev => [...prev, 'Erro ao desregistrar: ' + e.message]);
      }
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4 mt-6 text-white text-xs font-mono">
      <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
        <h3 className="font-bold flex items-center space-x-2 text-indigo-400">
          <Activity className="w-4 h-4" />
          <span>SW Diagnostics</span>
        </h3>
        <button 
          onClick={checkSW}
          className={`p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status atual:</span>
          <span className="flex items-center space-x-1.5 font-bold">
            {swState === 'Ativo (running)' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            {swState.includes('waiting') && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            <span className={`${
              swState === 'Ativo (running)' ? 'text-green-400' :
              swState.includes('waiting') ? 'text-amber-400' :
              swState.includes('Erro') || swState === 'Não registrado' ? 'text-red-400' : 'text-blue-400'
            }`}>
              {swState}
            </span>
          </span>
        </div>

        {errorLogs.length > 0 && (
          <div className="mt-2 bg-gray-950 rounded-lg p-2 max-h-32 overflow-y-auto">
            <span className="text-[10px] text-gray-500 mb-1 block">Logs:</span>
            {errorLogs.map((log, i) => (
              <div key={i} className="text-[10px] text-amber-200 border-l border-amber-500/30 pl-2 mb-1 py-0.5">
                {log}
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-800 flex justify-end">
          <button 
            onClick={handleUnregister}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
          >
            Forçar Desregistro
          </button>
        </div>
      </div>
    </div>
  );
}
