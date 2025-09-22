
// src/firebase/config.ts
// console.log('--- Firebase config.ts: LOG 001 - File execution started ---');
// console.log('--- Firebase config.ts: LOG 002 - Attempting to read NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
// console.log('--- Firebase config.ts: LOG 003 - Attempting to read NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// console.log('--- Firebase config.ts: LOG 004 - Firebase SDK imports successful ---');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// console.log('--- Firebase config.ts: LOG 005 - Constructed firebaseConfig object:', JSON.stringify(firebaseConfig, (key, value) => value === undefined ? 'VALUE_IS_UNDEFINED_IN_CONFIG_OBJECT' : value, 2));

if (!firebaseConfig.projectId) {
  const errorMessage = "CRITICAL Firebase Config Error from src/firebase/config.ts: firebaseConfig.projectId is missing after construction. This means process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID was 'undefined' or empty. Check your .env.local file (it must be in the project root, variables must start with NEXT_PUBLIC_, and have no quotes around values). You MUST restart your Next.js dev server after any .env.local changes. If using Cloud Workstations or a similar environment, verify how client-side NEXT_PUBLIC_ variables are set and exposed.";
  console.error(errorMessage);
  // if (typeof window !== 'undefined' && typeof alert !== 'undefined') { // Keep alert for critical failure
    // alert(errorMessage);
  // }
  throw new Error(errorMessage);
}
// if (!firebaseConfig.apiKey) { // This check can be less critical for Firestore-only usage
//   const warningMessage = "Firebase Config WARNING from src/firebase/config.ts: firebaseConfig.apiKey is missing. This is usually required for most Firebase services.";
//   console.warn(warningMessage);
// }


let app: FirebaseApp;
let db: Firestore;

try {
  if (getApps().length === 0) {
    // console.log('--- Firebase config.ts: LOG 006 - No Firebase app initialized yet. Attempting initializeApp().');
    app = initializeApp(firebaseConfig);
    // console.log('--- Firebase config.ts: LOG 007 - Firebase app initialized successfully. Name:', app.name);
  } else {
    app = getApps()[0];
    // console.log('--- Firebase config.ts: LOG 006 - Using existing Firebase app instance. Name:', app.name);
  }

  db = getFirestore(app);
  // console.log('--- Firebase config.ts: LOG 008 - Firestore instance obtained successfully.');

} catch (e) {
  const initErrorMessage = '--- Firebase config.ts: LOG 009 - CRITICAL error during Firebase/Firestore initialization: ' + (e instanceof Error ? e.message : String(e));
  console.error(initErrorMessage, e);
  // if (typeof window !== 'undefined' && typeof alert !== 'undefined') { // Keep alert for critical failure
    // alert(initErrorMessage);
  // }
  throw e; // Re-throw the error to ensure it's not swallowed
}

// console.log('--- Firebase config.ts: LOG 010 - Firebase setup presumed complete. Exporting db.');
export { app, db };
