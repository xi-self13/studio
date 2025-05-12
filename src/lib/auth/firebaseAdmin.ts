// src/lib/auth/firebaseAdmin.ts
import admin from 'firebase-admin';

const serviceAccountKeyEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKeyEnv) {
  console.warn(
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is not set. Server-side authentication will not work.'
  );
}

let serviceAccount: admin.ServiceAccount | undefined = undefined;

if (serviceAccountKeyEnv) {
    try {
        serviceAccount = JSON.parse(serviceAccountKeyEnv);
    } catch (e) {
        console.error("Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON string.", e);
    }
}


export function initializeAdminApp() {
  if (!admin.apps.length && serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // If using Realtime Database
      });
      console.log('Firebase Admin SDK initialized.');
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  } else if (!admin.apps.length && !serviceAccount) {
    console.warn("Firebase Admin SDK not initialized because service account key is missing or invalid.");
  }
}

// Initialize on load
// initializeAdminApp(); // It's better to call this explicitly when needed or in a server startup file.

export { admin };
