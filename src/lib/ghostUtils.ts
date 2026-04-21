import { Ghost } from 'lucide-react';

const GHOST_COLORS = [
  'text-indigo-500',
  'text-purple-500',
  'text-pink-500',
  'text-blue-500',
  'text-emerald-500',
  'text-orange-500',
  'text-rose-500',
  'text-cyan-500'
];

const GHOST_NAMES = [
  'Espectro Silencioso',
  'Sombra Agitada',
  'Alma Curiosa',
  'Espírito Veloz',
  'Visão Noturna',
  'Eco Distante',
  'Vulto Amigável',
  'Presença Astral'
];

export const getGhostIdentity = (userId: string, threadId: string) => {
  if (!userId || !threadId) return { name: 'Anônimo', color: 'text-indigo-400' };
  
  // Deterministic seed based on combination of user and thread
  const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
               threadId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
               
  const colorIndex = seed % GHOST_COLORS.length;
  const nameIndex = seed % GHOST_NAMES.length;
  
  return {
    name: GHOST_NAMES[nameIndex],
    color: GHOST_COLORS[colorIndex]
  };
};
