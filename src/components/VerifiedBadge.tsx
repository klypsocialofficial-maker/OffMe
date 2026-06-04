import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  tier?: 'silver' | 'gold' | 'black' | string;
}

export default function VerifiedBadge({ className = "w-4 h-4", tier = 'gold' }: VerifiedBadgeProps) {
  const [isShown, setIsShown] = useState(false);
  
  let colorClass = 'text-yellow-500'; // Default to gold
  if (tier === 'silver') colorClass = 'text-slate-400';
  if (tier === 'black') colorClass = 'text-gray-900';

  return (
    <span className="relative inline-flex items-center cursor-pointer" onClick={() => setIsShown(!isShown)}>
      <BadgeCheck className={`${className} ${colorClass}`} fill="currentColor" stroke="white" />
      <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded ${isShown ? 'opacity-100' : 'opacity-0'} transition-opacity pointer-events-none whitespace-nowrap z-50`}>
        Verificado {tier === 'silver' ? 'Prata' : tier === 'black' ? 'Business' : 'Gold'}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900"></span>
      </span>
    </span>
  );
}
