import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BADGES } from '../constants/badges';

export const awardPoints = async (userId: string, points: number) => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const currentPoints = (userData.points || 0) + points;
    const currentLevel = userData.level || 1;
    
    // Simple level up logic: level * 200 points per level
    const nextLevelPoints = currentLevel * 200;
    let newLevel = currentLevel;
    
    if (currentPoints >= nextLevelPoints) {
      newLevel += 1;
    }
    
    await updateDoc(userRef, {
      points: currentPoints,
      level: newLevel
    });

    // Check for badges based on points/level
    await checkBadges(userId, { ...userData, points: currentPoints, level: newLevel });
    
    return { points: currentPoints, level: newLevel };
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};

export const sendTip = async (senderId: string, receiverId: string, amount: number) => {
  if (!db || amount <= 0 || senderId === receiverId) throw new Error("Invalid tip operation");
  const senderRef = doc(db, 'users', senderId);
  const receiverRef = doc(db, 'users', receiverId);
  
  try {
    const senderSnap = await getDoc(senderRef);
    if (!senderSnap.exists()) throw new Error("Sender not found");
    const senderData = senderSnap.data();
    
    if ((senderData.points || 0) < amount) {
      throw new Error("Saldo de pontos insuficiente para dar essa gorjeta.");
    }

    // Deduct from sender
    await updateDoc(senderRef, {
      points: (senderData.points || 0) - amount
    });

    // Add to receiver using existing awardPoints logic to handle leveling up
    await awardPoints(receiverId, amount);

    return true;
  } catch (error) {
    console.error('Error sending tip:', error);
    throw error;
  }
};

export const checkBadges = async (userId: string, userData: any) => {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  const earnedBadges = userData.badges || [];
  const newBadges = [];

  // Super Engaged: > 100 points (using points as a proxy for interaction for now)
  if (userData.points >= 100 && !earnedBadges.includes('super_engaged')) {
    newBadges.push('super_engaged');
  }

  // Top Creator: Based on points milestone
  if (userData.points >= 500 && !earnedBadges.includes('top_creator')) {
    newBadges.push('top_creator');
  }

  // Influencer: Followers
  if (userData.followers?.length >= 10 && !earnedBadges.includes('influencer')) {
    newBadges.push('influencer');
  }

  if (newBadges.length > 0) {
    await updateDoc(userRef, {
      badges: arrayUnion(...newBadges)
    });
  }
};
