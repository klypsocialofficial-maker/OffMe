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
    if (!messaging) {
      alert('Messaging not supported in this browser.');
      return;
    }

    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        alert('Configuration Error: VITE_FIREBASE_VAPID_KEY is missing in environment variables.');
        console.error('VITE_FIREBASE_VAPID_KEY is missing.');
        return;
      }

      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey
        });

        if (currentToken) {
          setToken(currentToken);
          // Save token to user profile in Firestore
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(currentToken),
              notificationsEnabled: true
            });
            alert('Notifications enabled successfully!');
          }
        } else {
          alert('Failed to generate push token. Try again or check browser settings.');
          console.log('No registration token available.');
        }
      } else {
        alert('Notification permission denied.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      alert('Error enabling notifications: ' + (err instanceof Error ? err.message : String(err)));
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
