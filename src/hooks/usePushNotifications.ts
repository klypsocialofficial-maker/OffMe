import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getMessagingInstance, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const requestNotificationPermission = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    const messaging = await getMessagingInstance();
    if (permission === 'granted' && messaging) {
      const registration = await navigator.serviceWorker.getRegistration();
      const token = await getToken(messaging, {
        vapidKey: 'BFsixg_JwwMY4m3yMoZC9b-D4LIRsNcepSkQGkzCgBsnkdbGMmXdtjDCEbrgYYfSULAkTjo3WnPnHbXthoO69b0',
        serviceWorkerRegistration: registration || undefined
      });
      if (token) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        return true;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return false;
};

export const usePushNotifications = () => {
  const { userProfile } = useAuth();

  useEffect(() => {
    if (!userProfile?.uid) return;
    requestNotificationPermission(userProfile.uid);
  }, [userProfile?.uid]);
};
