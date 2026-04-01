import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
}

export default function VerifiedBadge({ className = "w-4 h-4 text-blue-500" }: VerifiedBadgeProps) {
  return <BadgeCheck className={className} fill="currentColor" stroke="white" />;
}
