import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey))
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    }
  }
  return {
    db: getFirestore('ai-studio-187fa848-4c3a-4231-9ff8-5231ac973055')
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId, senderId, text } = req.body;

  if (!conversationId || !senderId || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { db } = getFirebaseAdmin();

    // 1. Add message to subcollection
    await db.collection('conversations').doc(conversationId).collection('messages').add({
      text: text,
      senderId: senderId,
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });

    // 2. Update conversation metadata
    // We need to find the other participant to update their unread count
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    const convData = convDoc.data();
    
    if (convData) {
      const otherId = convData.participants.find(id => id !== senderId);
      const updateData: any = {
        lastMessage: text,
        lastMessageSenderId: senderId,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      if (otherId) {
        updateData[`unreadCount.${otherId}`] = FieldValue.increment(1);
      }

      await db.collection('conversations').doc(conversationId).update(updateData);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error replying to message from SW:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
