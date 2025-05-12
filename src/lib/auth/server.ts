// src/lib/auth/server.ts
import { auth as adminAuth } from 'firebase-admin';
import { cookies } from 'next/headers';
import { initializeAdminApp } from './firebaseAdmin'; // Ensure this initializes your admin app
import type { User } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // client 'db' for user data, adminAuth for verification
import { USERS_COLLECTION } from '@/lib/constants';


export async function getCurrentUserServer(): Promise<User | null> {
  initializeAdminApp(); // Ensure admin app is initialized

  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedIdToken = await adminAuth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
    
    // Fetch user details from Firestore using the client 'db' instance
    // as admin SDK doesn't have direct access to client-side user profiles easily
    // unless you replicate all user data under an admin-accessible path.
    const userDocRef = doc(db, USERS_COLLECTION, decodedIdToken.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
        const userData = userSnap.data();
         return {
            uid: decodedIdToken.uid,
            email: decodedIdToken.email || null,
            name: userData.name || decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
            avatarUrl: userData.avatarUrl || decodedIdToken.picture || null,
            isBot: false, // Server-fetched users are assumed not to be bots
            statusMessage: userData.statusMessage,
            shapesIncApiKey: userData.shapesIncApiKey,
            shapesIncUsername: userData.shapesIncUsername,
            linkedAccounts: userData.linkedAccounts,
            lastSeen: userData.lastSeen ? userData.lastSeen.toMillis() : null,
        };
    } else {
        // This case should ideally not happen if users are created on client-side signup
        // Or, you might want to create a basic profile here if it's missing
        console.warn(`User document not found in Firestore for UID: ${decodedIdToken.uid} during server-side auth.`);
        return { // Fallback basic user from token
            uid: decodedIdToken.uid,
            email: decodedIdToken.email || null,
            name: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
            avatarUrl: decodedIdToken.picture || null,
            isBot: false,
        };
    }

  } catch (error) {
    console.error('Error verifying session cookie or fetching user data server-side:', error);
    // Optionally clear the invalid cookie
    // cookies().delete('__session'); 
    return null;
  }
}
