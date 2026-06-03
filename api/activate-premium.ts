import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebase-admin-helper';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, tier } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID handles are required' });
  }

  const validTiers = ['silver', 'gold', 'black'];
  const finalTier = validTiers.includes(tier) ? tier : 'gold';

  // Determine points benefit to award
  let pointsToAward = 2500; // Gold default
  if (finalTier === 'silver') {
    pointsToAward = 500;
  } else if (finalTier === 'black') {
    pointsToAward = 10000;
  }

  try {
    const { db } = getFirebaseAdmin();
    if (!db) {
      throw new Error("Could not initialize Firebase database connections.");
    }

    const userDocRef = db.collection('users').doc(userId);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found in OffMe registry.' });
    }

    // Atomic update of user premium attributes and points
    await userDocRef.update({
      isPremium: true,
      isVerified: true,
      premiumTier: finalTier,
      points: FieldValue.increment(pointsToAward),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`[Premium Activation] Activated tier "${finalTier}" (+${pointsToAward} pts) successfully for userId: ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Plano ${finalTier.toUpperCase()} ativado com sucesso!`,
      awardedPoints: pointsToAward
    });
  } catch (error: any) {
    console.error("[Premium Activation Error]", error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar a ativação do perfil premium.' });
  }
}
