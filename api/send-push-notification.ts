import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const messaging = getMessaging();
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body } = req.body;

  try {
    // Get user's FCM tokens
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmTokens = userDoc.data()?.fcmTokens;

    if (!fcmTokens || fcmTokens.length === 0) {
      return res.status(200).json({ message: 'No tokens found' });
    }

    // Send push notification
    const message = {
      notification: {
        title,
        body
      },
      tokens: fcmTokens
    };

    const response = await messaging.sendEachForMulticast(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
