import { Award, Zap, Heart, MessageCircle, UserPlus, Star, Clock, Flame } from 'lucide-react';

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  requirement: string;
}

export const BADGES: Badge[] = [
  {
    id: 'founder',
    label: 'Fundador',
    description: 'Um dos primeiros membros do OffMe.',
    icon: Star,
    color: 'text-yellow-500',
    requirement: 'Criação de conta nas primeiras semanas.'
  },
  {
    id: 'super_engaged',
    label: 'Super Engajado',
    description: 'Sempre presente nas conversas.',
    icon: Flame,
    color: 'text-orange-500',
    requirement: 'Mais de 100 interações (likes/respostas).'
  },
  {
    id: 'top_creator',
    label: 'Top Criador',
    description: 'Seus posts são os favoritos da galera.',
    icon: Award,
    color: 'text-purple-500',
    requirement: 'Mais de 50 posts publicados.'
  },
  {
    id: 'conversationalist',
    label: 'Conversador',
    description: 'Adora uma boa thread.',
    icon: MessageCircle,
    color: 'text-blue-500',
    requirement: 'Mais de 50 respostas enviadas.'
  },
  {
    id: 'influencer',
    label: 'Influenciador',
    description: 'Muita gente quer ver o que você posta.',
    icon: UserPlus,
    color: 'text-indigo-500',
    requirement: 'Mais de 100 seguidores.'
  },
  {
    id: 'early_bird',
    label: 'Madrugador',
    description: 'Acorda cedo pra não perder nada.',
    icon: Clock,
    color: 'text-cyan-500',
    requirement: 'Logado antes das 7h por 5 dias.'
  },
  {
    id: 'heart_stealer',
    label: 'Ladrão de Corações',
    description: 'Seus posts recebem muito amor.',
    icon: Heart,
    color: 'text-pink-500',
    requirement: 'Mais de 500 likes recebidos no total.'
  },
  {
    id: 'fast_mover',
    label: 'Veloz',
    description: 'Posta e interage na velocidade da luz.',
    icon: Zap,
    color: 'text-yellow-400',
    requirement: 'Atividade intensa em curto período.'
  }
];
