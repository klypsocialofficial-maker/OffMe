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
  
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase Messaging is not supported in this environment.");
    }
  }).catch((error) => {
    console.error("Error checking Firebase Messaging support:", error);
  });
} catch (error) {
  console.error("Firebase initialization error. Please check your config.", error);
}

export const googleProvider = new GoogleAuthProvider();
export { auth, db, messaging };
