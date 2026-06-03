import { getFirebaseAdmin } from './firebase-admin-helper';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, data } = req.body;

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
      data: data ? Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {} as Record<string, string>) : {},
      tokens: fcmTokens
    };

    const response = await messaging.sendEachForMulticast(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
