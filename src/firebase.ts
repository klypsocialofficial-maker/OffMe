import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

let app;
let auth;
let db;
let storage;
let messaging: any = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  const cacheConfig = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
  };

  if (firebaseConfig.firestoreDatabaseId) {
    db = initializeFirestore(app, cacheConfig, firebaseConfig.firestoreDatabaseId);
  } else {
    db = initializeFirestore(app, cacheConfig);
  }
  
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization error. Please check your config.", error);
}

export const getMessagingInstance = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { auth, db, storage };
