
// src/lib/firestoreService.ts
'use server';

import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import type { BotConfig } from '@/types';

const USER_BOTS_COLLECTION = 'userBots'; // Top-level collection for user bots

/**
 * Saves a user's bot configuration to Firestore.
 * Each user will have their bots stored in a subcollection under their UID,
 * or bots stored in a top-level collection filtered by ownerUserId.
 * Using a top-level collection with a query on ownerUserId for simplicity here.
 */
export async function saveUserBotConfigToFirestore(botConfig: BotConfig): Promise<void> {
  try {
    const botDocRef = doc(db, USER_BOTS_COLLECTION, botConfig.id);
    await setDoc(botDocRef, botConfig);
    console.log(`Bot configuration for ${botConfig.name} (ID: ${botConfig.id}) saved for user ${botConfig.ownerUserId}.`);
  } catch (error) {
    console.error('Error saving bot configuration to Firestore:', error);
    throw new Error('Failed to save bot configuration.');
  }
}

/**
 * Retrieves all bot configurations for a given user ID from Firestore.
 */
export async function getUserBotConfigsFromFirestore(userId: string): Promise<BotConfig[]> {
  try {
    const botsCollectionRef = collection(db, USER_BOTS_COLLECTION);
    const q = query(botsCollectionRef, where('ownerUserId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const botConfigs: BotConfig[] = [];
    querySnapshot.forEach((docSnap) => {
      botConfigs.push({ id: docSnap.id, ...docSnap.data() } as BotConfig);
    });
    console.log(`Retrieved ${botConfigs.length} bot configurations for user ${userId}.`);
    return botConfigs;
  } catch (error) {
    console.error('Error retrieving bot configurations from Firestore:', error);
    throw new Error('Failed to retrieve bot configurations.');
  }
}

/**
 * Deletes a specific bot configuration for a user from Firestore.
 */
export async function deleteUserBotConfigFromFirestore(botId: string): Promise<void> {
  try {
    const botDocRef = doc(db, USER_BOTS_COLLECTION, botId);
    await deleteDoc(botDocRef);
    console.log(`Bot configuration with ID: ${botId} deleted.`);
  } catch (error) {
    console.error('Error deleting bot configuration from Firestore:', error);
    throw new Error('Failed to delete bot configuration.');
  }
}
