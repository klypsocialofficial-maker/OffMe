import React, { useEffect, useRef } from 'react';

interface GoogleAdProps {
  key?: string | number;
  className?: string;
  slotId?: string;
}

export default function GoogleAd({ className = '', slotId = '9395334432' }: GoogleAdProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    try {
      // O AdSense precisa ser inicializado para cada bloco de anúncio inserido na página
      // Usamos setTimeout para garantir que o DOM foi atualizado antes de chamar o push
      setTimeout(() => {
        if (isMounted && adRef.current && !adRef.current.getAttribute('data-ad-status')) {
          // @ts-ignore
          if (window.adsbygoogle) {
            // @ts-ignore
            window.adsbygoogle.push({});
          }
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao carregar o anúncio do Google AdSense:', err);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`w-full overflow-hidden flex flex-col items-center bg-gray-50/50 border-b border-gray-100 py-4 ${className}`}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Publicidade</span>
      
      {/* 
        ATENÇÃO: Substitua o data-ad-client pelo seu ID de editor (ca-pub-XXX)
        e o data-ad-slot pelo ID do bloco de anúncios criado no painel do AdSense.
      */}
      <ins
        ref={adRef}
        className="adsbygoogle w-full"
        style={{ display: 'block', textAlign: 'center', minHeight: '100px' }}
        data-ad-client="ca-pub-4327519756355647"
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
