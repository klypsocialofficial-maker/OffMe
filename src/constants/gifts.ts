import { Heart, Star, Zap, Flame, Crown, Gift, Ghost } from 'lucide-react';

export interface GiftType {
  id: string;
  name: string;
  price: number;
  icon: any;
  color: string;
  description: string;
}

export const GIFTS: GiftType[] = [
  {
    id: 'heart_sparkle',
    name: 'Coração Brilhante',
    price: 50,
    icon: Heart,
    color: 'text-pink-500',
    description: 'Um gesto carinhoso de agradecimento.'
  },
  {
    id: 'cool_star',
    name: 'Estrela de Ouro',
    price: 150,
    icon: Star,
    color: 'text-yellow-500',
    description: 'Para quem brilhou em um post.'
  },
  {
    id: 'lightning',
    name: 'Energia Pura',
    price: 300,
    icon: Zap,
    color: 'text-blue-400',
    description: 'Impulsione o criador com energia!'
  },
  {
    id: 'mega_ghost',
    name: 'Ghost Master',
    price: 500,
    icon: Ghost,
    color: 'text-indigo-600',
    description: 'O presente supremo dos fantasmas.'
  },
  {
    id: 'royal_crown',
    name: 'Coroa Real',
    price: 1000,
    icon: Crown,
    color: 'text-amber-500',
    description: 'Reconhecimento de realeza klypiana.'
  }
];
