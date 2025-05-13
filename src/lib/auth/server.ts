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
    
    const userDocRef = doc(db, USERS_COLLECTION, decodedIdToken.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
        const userData = userSnap.data();
         return {
            uid: decodedIdToken.uid,
            email: decodedIdToken.email || null,
            name: userData.name || decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
            username: userData.username || null,
            avatarUrl: userData.avatarUrl || decodedIdToken.picture || null,
            isBot: false, 
            statusMessage: userData.statusMessage,
            shapesIncApiKey: userData.shapesIncApiKey,
            shapesIncUsername: userData.shapesIncUsername,
            linkedAccounts: userData.linkedAccounts,
            lastSeen: userData.lastSeen ? userData.lastSeen.toMillis() : null,
            isFounder: userData.isFounder || false,
            hasSetUsername: userData.hasSetUsername || false,
        };
    } else {
        console.warn(`User document not found in Firestore for UID: ${decodedIdToken.uid} during server-side auth.`);
        return { 
            uid: decodedIdToken.uid,
            email: decodedIdToken.email || null,
            name: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
            username: null,
            avatarUrl: decodedIdToken.picture || null,
            isBot: false,
            isFounder: false,
            hasSetUsername: false,
        };
    }

  } catch (error) {
