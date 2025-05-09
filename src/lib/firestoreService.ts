
// src/lib/firestoreService.ts
'use server';

import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, addDoc } from 'firebase/firestore';
import type { BotConfig, PlatformShape } from '@/types';

const USER_BOTS_COLLECTION = 'userBots'; // Top-level collection for user bots
const PLATFORM_SHAPES_COLLECTION = 'platformShapes'; // Top-level collection for platform shapes

/**
 * Saves a user's bot configuration to Firestore.
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
    // Return empty array on error to prevent app crash, allow UI to handle no data
    return [];
    // throw new Error('Failed to retrieve bot configurations.');
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


/**
 * Retrieves all platform-available shapes from Firestore.
 */
export async function getPlatformShapesFromFirestore(): Promise<PlatformShape[]> {
  try {
    const shapesCollectionRef = collection(db, PLATFORM_SHAPES_COLLECTION);
    const querySnapshot = await getDocs(shapesCollectionRef);

    const shapes: PlatformShape[] = [];
    querySnapshot.forEach((docSnap) => {
      shapes.push({ id: docSnap.id, ...docSnap.data() } as PlatformShape);
    });
    console.log(`Retrieved ${shapes.length} platform shapes from Firestore.`);
    return shapes;
  } catch (error) {
    console.error('Error retrieving platform shapes from Firestore:', error);
    return []; // Return empty array on error
  }
}

/**
 * Adds a new platform shape to Firestore.
 * If an ID is provided in shapeData and a document with that ID already exists, it will be overwritten.
 * If no ID is provided, Firestore will auto-generate an ID.
 */
export async function addPlatformShapeToFirestore(shapeData: Omit<PlatformShape, 'id'> & { id?: string }): Promise<PlatformShape> {
  try {
    let docRef;
    let idToUse = shapeData.id;

    // Firestore expects data to not contain the 'id' field if it's used as the document key.
    // Create a new object for Firestore without the 'id' field if 'id' is present in shapeData.
    const dataForFirestore: any = { ...shapeData };
    if (idToUse) {
      delete dataForFirestore.id; // Remove id from the data payload if we're using it as doc key
      docRef = doc(db, PLATFORM_SHAPES_COLLECTION, idToUse);
      await setDoc(docRef, dataForFirestore);
    } else {
      // If no ID is provided, let Firestore auto-generate it.
      // The 'id' field might be undefined in shapeData, so ensure it's not passed to addDoc.
      const { id, ...dataWithoutId } = shapeData; // Explicitly remove potential undefined id
      docRef = await addDoc(collection(db, PLATFORM_SHAPES_COLLECTION), dataWithoutId);
      idToUse = docRef.id;
    }
    
    console.log(`Platform shape "${shapeData.name}" (ID: ${idToUse}) added/updated in Firestore.`);
    return { ...shapeData, id: idToUse } as PlatformShape;
  } catch (error) {
    console.error('Error adding platform shape to Firestore:', error);
    throw new Error('Failed to add platform shape.');
  }
}

// Example of how you might seed data (call this once, e.g. in a utility or on app init if needed)
// Ensure shapeUsernames are valid for your Shapes.inc setup.
export async function seedPlatformShapes() {
  const shapesToSeed: Array<Omit<PlatformShape, 'id'> & { id?: string }> = [
    {
      id: 'artemis-ai-official',
      name: 'Artemis AI',
      description: 'A creative AI that excels at visual concepts and artistic ideas.',
      shapeUsername: 'artemis_official', // Replace with YOUR actual Shapes.inc username
      avatarUrl: 'https://picsum.photos/seed/artemisai/100/100',
      dataAiHint: 'female robot',
      tags: ['creative', 'visual', 'art'],
    },
    {
      id: 'scholar-bot-prime',
      name: 'Scholar Bot Prime',
      description: 'A knowledgeable AI assistant for research and learning.',
      shapeUsername: 'scholar_prime', // Replace with YOUR actual Shapes.inc username
      avatarUrl: 'https://picsum.photos/seed/scholarbot/100/100',
      dataAiHint: 'wise owl',
      tags: ['knowledge', 'research', 'education'],
    },
  ];

  let seededCount = 0;
  for (const shape of shapesToSeed) {
    try {
      // Check if shape already exists by ID to prevent re-seeding identical IDs
      // This simple check assumes IDs are unique and seeding means creating if not exists.
      // For more complex seeding (e.g. updates), you'd need getDoc first.
      // For now, setDoc will overwrite if ID exists, or create if not.
      await addPlatformShapeToFirestore(shape);
      seededCount++;
    } catch (e) {
      console.error(`Failed to seed shape ${shape.name}:`, e);
    }
  }
  if (seededCount > 0) {
    console.log(`Successfully seeded ${seededCount} platform shapes.`);
  }
}
