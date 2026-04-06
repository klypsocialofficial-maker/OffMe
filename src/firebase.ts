import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

let app;
let auth;
let db;
let messaging: any = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
export { auth, db };
