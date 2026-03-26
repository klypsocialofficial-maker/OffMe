import { useState, useEffect } from 'react';
import { messaging, getToken, onMessage, db, updateDoc, doc, auth, arrayUnion } from '../firebase';
import { User } from '../types';

export function useNotifications(providedUser: User | null = null) {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );

  const user = providedUser || (auth.currentUser as unknown as User);

  useEffect(() => {
    if (!user || !messaging) return;

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      // You can show a toast or custom notification here
      if (payload.notification) {
        new Notification(payload.notification.title || 'New Message', {
          body: payload.notification.body,
          icon: payload.notification.image || '/icon-192x192.png',
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const requestPermission = async () => {
    if (!messaging) return;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const currentToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // You need to generate this in Firebase Console
        });

        if (currentToken) {
          setToken(currentToken);
          // Save token to user profile in Firestore
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(currentToken),
              notificationsEnabled: true
            });
          }
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
    }
  };

  const disableNotifications = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: false
      });
      setPermission('default');
    }
  };

  return { token, permission, requestPermission, disableNotifications };
}
