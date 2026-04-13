import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Lazy initialization of Firebase Admin
function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(serviceAccount)
        });
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY');
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    } else {
      throw new Error('Firebase Admin credentials not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY or individual FIREBASE_* variables.');
    }
  }
  
  return {
    messaging: getMessaging(),
    db: getFirestore()
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body } = req.body;

  try {
    const { db, messaging } = getFirebaseAdmin();
    
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
