import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Lazy initialization of Firebase Admin
function getFirebaseAdmin() {
  let firebaseConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.warn("Could not load firebase-applet-config.json inside api handler", e);
  }

  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: firebaseConfig.projectId ? `https://${firebaseConfig.projectId}.firebaseio.com` : undefined
        });
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: firebaseConfig.projectId ? `https://${firebaseConfig.projectId}.firebaseio.com` : undefined
      });
    } else if (firebaseConfig.projectId) {
      initializeApp({
        projectId: firebaseConfig.projectId,
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
      });
    } else {
      initializeApp();
    }
  }

  return firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();
}

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
    const db = getFirebaseAdmin();
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
