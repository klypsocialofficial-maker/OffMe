import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';

function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let val = value.trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  if (val.startsWith("'") && val.endsWith("'")) {
    val = val.slice(1, -1);
  }
  return val;
}

export function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccountKey = cleanEnvValue(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const projectId = cleanEnvValue(process.env.FIREBASE_PROJECT_ID) || firebaseConfig.projectId;
    const clientEmail = cleanEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
    let privateKey = cleanEnvValue(process.env.FIREBASE_PRIVATE_KEY);

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
      if (serviceAccountKey) {
        initializeApp({
          credential: cert(JSON.parse(serviceAccountKey)),
          databaseURL: projectId ? `https://${projectId}.firebaseio.com` : undefined
        });
        console.log("Firebase Admin successfully initialized via service account key JSON.");
      } else if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log("Firebase Admin successfully initialized via discrete env variables.");
      } else if (projectId) {
        initializeApp({
          projectId,
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log(`Firebase Admin initialized with projectId: ${projectId}`);
      } else {
        initializeApp();
        console.log("Firebase Admin initialized with default settings.");
      }
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
    }
  }

  const apps = getApps();
  const defaultApp = apps.length > 0 ? apps[0] : undefined;

  const db = firebaseConfig.firestoreDatabaseId && defaultApp
    ? getFirestore(defaultApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore();

  return {
    db,
    messaging: getMessaging(),
    auth: getAuth(),
  };
}
