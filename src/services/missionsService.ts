import { collection, doc, getDocs, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'post' | 'like' | 'reply' | 'dm' | 'follow' | 'share' | 'streak';
  requirement: number;
  reward: number;
  frequency: 'daily' | 'weekly' | 'one-time';
}

const DEFAULT_MISSIONS: Omit<Mission, 'id'>[] = [
  {
    title: 'Primeiro do Dia',
    description: 'Publique seu primeiro post de hoje.',
    type: 'post',
    requirement: 1,
    reward: 50,
    frequency: 'daily'
  },
  {
    title: 'Espalhando o Amor',
    description: 'Curta 5 posts de outros usuários.',
    type: 'like',
    requirement: 5,
    reward: 30,
    frequency: 'daily'
  },
  {
    title: 'Bom de Papo',
    description: 'Responda a 3 posts diferentes.',
    type: 'reply',
    requirement: 3,
    reward: 40,
    frequency: 'daily'
  },
  {
    title: 'Networker',
    description: 'Siga 2 novos usuários.',
    type: 'follow',
    requirement: 2,
    reward: 30,
    frequency: 'daily'
  },
  {
    title: 'Socializador',
    description: 'Envie uma mensagem direta.',
    type: 'dm',
    requirement: 1,
    reward: 20,
    frequency: 'daily'
  }
];

export const seedMissions = async () => {
  if (!db || !auth?.currentUser || auth.currentUser.email !== 'klypsocialofficial@gmail.com') return;

  try {
    const missionsCol = collection(db, 'missions');
    const snapshot = await getDocs(missionsCol);
    
    if (snapshot.empty) {
      console.log('Seeding default missions...');
      for (const m of DEFAULT_MISSIONS) {
        const newDocRef = doc(missionsCol);
        await setDoc(newDocRef, {
          ...m,
          createdAt: serverTimestamp()
        });
      }
      console.log('Missions seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding missions:', error);
  }
};
