import { useState, useEffect, useCallback } from 'react';
import { db, auth, messaging, getToken, onMessage, updateDoc, doc, arrayUnion } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const user = auth.currentUser;

  const requestPermission = useCallback(async () => {
    if (!messaging || typeof Notification === 'undefined') return;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted' && user) {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });

        if (token) {
          console.log('FCM Token:', token);
          // Save token to user profile
          await updateDoc(doc(db, 'users', user.uid), {
            fcmTokens: arrayUnion(token)
          });
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    // Listen for foreground messages
    let unsubscribeOnMessage: (() => void) | undefined;
    if (messaging) {
      unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // You could show a custom toast here
      });
    }

    return () => {
      unsubscribe();
      if (unsubscribeOnMessage) unsubscribeOnMessage();
    };
  }, [user]);

  return { unreadCount, permission, requestPermission };
}
