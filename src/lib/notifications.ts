import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function handleMentions(content: string, postId: string, userProfile: any) {
  if (!content || !postId || !userProfile) return;

  const mentions = content.match(/@(\w+)/g);
  if (!mentions) return;

  const mentionedUsernames = [...new Set(mentions.map(m => m.substring(1)))];

  for (const username of mentionedUsernames) {
    if (username === userProfile.username) continue; // Don't notify self

    try {
      const userQuery = query(collection(db, 'users'), where('username', '==', username));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const mentionedUserDoc = userSnapshot.docs[0];
        const mentionedUserId = mentionedUserDoc.id;

        // Create notification document
        await addDoc(collection(db, 'notifications'), {
          recipientId: mentionedUserId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'mention',
          postId: postId,
          content: content,
          read: false,
          createdAt: serverTimestamp()
        });

        // Trigger push notification
        fetch('/api/send-push-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mentionedUserId,
            title: 'Nova Menção',
            body: `@${userProfile.username} mencionou você em um post.`
          })
        }).catch(err => console.error('Error triggering push notification:', err));
      }
    } catch (error) {
      console.error(`Error handling mention for @${username}:`, error);
    }
  }
}

export async function sendPushNotification(userId: string, title: string, body: string) {
  return fetch('/api/send-push-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body })
  }).catch(err => console.error('Error triggering push notification:', err));
}
