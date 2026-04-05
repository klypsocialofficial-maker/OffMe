import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const usePushNotifications = () => {
  const { userProfile } = useAuth();

  useEffect(() => {
    if (!userProfile?.uid || !messaging) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, {
            vapidKey: 'BFsixg_JwwMY4m3yMoZC9b-D4LIRsNcepSkQGkzCgBsnkdbGMmXdtjDCEbrgYYfSULAkTjo3WnPnHbXthoO69b0'
          });
          if (token) {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    requestPermission();
  }, [userProfile?.uid]);
};
