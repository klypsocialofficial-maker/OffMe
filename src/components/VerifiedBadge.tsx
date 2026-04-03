import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
}

export default function VerifiedBadge({ className = "w-4 h-4 text-black" }: VerifiedBadgeProps) {
  return (
    <span className="relative inline-flex items-center group cursor-pointer">
      <BadgeCheck className={className} fill="currentColor" stroke="white" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        Verificado
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900"></span>
      </span>
    </span>
  );
}
