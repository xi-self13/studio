
// src/lib/firestoreService.ts
'use server';

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  addDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'; 
import type { BotConfig, PlatformShape, BotGroup } from '@/types'; 

const USER_BOTS_COLLECTION = 'userBots'; 
const PLATFORM_SHAPES_COLLECTION = 'platformShapes'; 
const BOT_GROUPS_COLLECTION = 'botGroups'; // Collection for Bot Groups

// --- BotConfig Functions --- 

export async function saveUserBotConfigToFirestore(botConfig: BotConfig): Promise<void> {
  try {
    const botDocRef = doc(db, USER_BOTS_COLLECTION, botConfig.id);
    // Ensure all fields from BotConfig are explicitly handled or set to null/default if optional and not provided
    const dataToSave = {
        name: botConfig.name,
        shapeUsername: botConfig.shapeUsername,
        apiKey: botConfig.apiKey, 
        ownerUserId: botConfig.ownerUserId,
        avatarUrl: botConfig.avatarUrl || null, 
        isPublic: botConfig.isPublic || false, 
        systemPrompt: botConfig.systemPrompt || null,
        greetingMessage: botConfig.greetingMessage || null,
    };
    await setDoc(botDocRef, dataToSave, { merge: true }); 
    console.log(`Bot configuration for ${botConfig.name} (ID: ${botConfig.id}) saved for user ${botConfig.ownerUserId}.`);
  } catch (error) {
    console.error('Error saving bot configuration to Firestore:', error);
    throw new Error('Failed to save bot configuration.');
  }
}

export async function getUserBotConfigsFromFirestore(userId: string): Promise<BotConfig[]> {
  try {
    const botsCollectionRef = collection(db, USER_BOTS_COLLECTION);
    const q = query(botsCollectionRef, where('ownerUserId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const botConfigs: BotConfig[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      botConfigs.push({
        id: docSnap.id,
        name: data.name,
        shapeUsername: data.shapeUsername,
        apiKey: data.apiKey, // This key should ideally not be sent to client unless absolutely necessary and secured.
        ownerUserId: data.ownerUserId,
        avatarUrl: data.avatarUrl,
        isPublic: data.isPublic || false,
        systemPrompt: data.systemPrompt,
        greetingMessage: data.greetingMessage,
      } as BotConfig);
    });
    return botConfigs;
  } catch (error) {
    console.error('Error retrieving bot configurations from Firestore:', error);
    return []; // Return empty array on error
  }
}

export async function getBotConfigFromFirestore(botId: string): Promise<BotConfig | null> {
  try {
    const botDocRef = doc(db, USER_BOTS_COLLECTION, botId);
    const docSnap = await getDoc(botDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        shapeUsername: data.shapeUsername,
        apiKey: data.apiKey, // Sensitive
        ownerUserId: data.ownerUserId,
        avatarUrl: data.avatarUrl,
        isPublic: data.isPublic || false,
        systemPrompt: data.systemPrompt,
        greetingMessage: data.greetingMessage,
      } as BotConfig;
    }
    return null;
  } catch (error) {
    console.error(`Error retrieving bot configuration ${botId} from Firestore:`, error);
    return null;
  }
}

export async function getPublicUserBotsFromFirestore(): Promise<BotConfig[]> {
  try {
    const botsCollectionRef = collection(db, USER_BOTS_COLLECTION);
    const q = query(botsCollectionRef, where('isPublic', '==', true));
    const querySnapshot = await getDocs(q);
    
    const publicBots: BotConfig[] = [];
    querySnapshot.forEach((docSnap) => {
       // For public listings, we should not expose the API key.
       // The component rendering this will need to handle interaction differently,
       // perhaps by initiating a DM or a specific action that doesn't require client-side API key.
       const data = docSnap.data();
      publicBots.push({
        id: docSnap.id,
        name: data.name,
        shapeUsername: data.shapeUsername,
        // apiKey: data.apiKey, // DO NOT EXPOSE API KEY PUBLICLY
        apiKey: '***', // Mask or omit for public listings
        ownerUserId: data.ownerUserId,
        avatarUrl: data.avatarUrl,
        isPublic: true, // by definition of the query
        systemPrompt: data.systemPrompt, // Personality might be fine to show
        greetingMessage: data.greetingMessage, // Greeting might be fine
       } as BotConfig);
    });
    return publicBots;
  } catch (error) {
    console.error('Error retrieving public user bot configurations from Firestore:', error);
    return [];
  }
}

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

// --- PlatformShape Functions --- 

export async function getPlatformShapesFromFirestore(): Promise<PlatformShape[]> {
  try {
    const shapesCollectionRef = collection(db, PLATFORM_SHAPES_COLLECTION);
    const querySnapshot = await getDocs(shapesCollectionRef);

    const shapes: PlatformShape[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      shapes.push({ // Ensure all fields from PlatformShape are included
        id: docSnap.id, 
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        dataAiHint: data.dataAiHint,
        shapeUsername: data.shapeUsername,
        tags: data.tags || [],
        isUserCreated: false, // Explicitly set for platform shapes
        ownerDisplayName: 'Platform', // Platform shapes don't have individual owners
      } as PlatformShape);
    });
    return shapes;
  } catch (error) {
    console.error('Error retrieving platform shapes from Firestore:', error);
    return []; 
  }
}

// Function to add/update platform shapes (e.g. for seeding by an admin)
// Note: 'id' can be provided to update an existing shape, or omitted for a new one.
export async function addPlatformShapeToFirestore(shapeData: Omit<PlatformShape, 'isUserCreated' | 'ownerDisplayName'> & { id?: string }): Promise<PlatformShape> {
  try {
    let docRef;
    let idToUse = shapeData.id;

    // Prepare data for Firestore, removing 'id' if it exists as it's used for the doc path
    const dataForFirestore: any = { ...shapeData };
    if (idToUse) {
      delete dataForFirestore.id; // 'id' field is used as document ID, not stored in document data itself
      docRef = doc(db, PLATFORM_SHAPES_COLLECTION, idToUse);
      await setDoc(docRef, dataForFirestore);
    } else {
      // If no ID, Firestore auto-generates one
      const { id, ...dataWithoutId } = shapeData; // remove id if it was accidentally passed as undefined
      docRef = await addDoc(collection(db, PLATFORM_SHAPES_COLLECTION), dataWithoutId);
      idToUse = docRef.id;
    }
    
    // Return the full PlatformShape object as it would be fetched
    return { ...shapeData, id: idToUse!, isUserCreated: false, ownerDisplayName: 'Platform' } as PlatformShape;
  } catch (error) {
    console.error('Error adding/updating platform shape to Firestore:', error);
    throw new Error('Failed to add/update platform shape.');
  }
}

// Example seeding function - run this once (e.g. via a script or admin UI)
export async function seedPlatformShapes() {
  const shapesToSeed: Array<Omit<PlatformShape, 'isUserCreated' | 'ownerDisplayName'> & { id?: string }> = [
    {
      id: 'artemis-ai-official', // Use a specific ID for predictable seeding/updates
      name: 'Artemis AI',
      description: 'A creative AI that excels at visual concepts and artistic ideas. She is very friendly and loves to help with art projects.',
      shapeUsername: 'artemis_official', // Replace with actual username from Shapes.inc
      avatarUrl: 'https://picsum.photos/seed/artemisai/100/100',
      dataAiHint: 'female robot',
      tags: ['creative', 'visual', 'art', 'friendly'],
    },
    {
      id: 'scholar-bot-prime',
      name: 'Scholar Bot Prime',
      description: 'A knowledgeable AI assistant for research and learning. Always formal and precise in its responses.',
      shapeUsername: 'scholar_prime', // Replace with actual username
      avatarUrl: 'https://picsum.photos/seed/scholarbot/100/100',
      dataAiHint: 'wise owl',
      tags: ['knowledge', 'research', 'education', 'formal'],
    },
  ];

  let seededCount = 0;
  for (const shape of shapesToSeed) {
    try {
      // Check if shape already exists to prevent duplicate entries if not using specific IDs
      // If using specific IDs like above, setDoc with merge:true could also work, or simply overwrite.
      // For this example, we'll assume addPlatformShapeToFirestore handles overwrite/creation if ID is given.
      await addPlatformShapeToFirestore(shape);
      seededCount++;
    } catch (e) {
      console.error(`Failed to seed shape ${shape.name}:`, e);
    }
  }
  if (seededCount > 0) {
    console.log(`Successfully seeded/updated ${seededCount} platform shapes.`);
  }
}


// --- BotGroup Functions --- 

const botGroupsCollectionRef = collection(db, BOT_GROUPS_COLLECTION);

/**
 * Creates a new bot group in Firestore.
 */
export async function createBotGroup(groupData: Omit<BotGroup, 'id'>): Promise<BotGroup> {
  try {
    const docRef = await addDoc(botGroupsCollectionRef, {
      ...groupData,
      botIds: groupData.botIds || [], // Ensure default empty array
      memberUserIds: groupData.memberUserIds || [], // Ensure default empty array
      description: groupData.description || null,
      avatarUrl: groupData.avatarUrl || null,
    });
    console.log(`Bot group "${groupData.name}" created with ID: ${docRef.id} by user ${groupData.ownerUserId}.`);
    return { ...groupData, id: docRef.id };
  } catch (error) {
    console.error('Error creating bot group in Firestore:', error);
    throw new Error('Failed to create bot group.');
  }
}

/**
 * Updates an existing bot group in Firestore.
 * Only allows updating fields editable by the owner, excluding ownerUserId and id.
 */
export async function updateBotGroup(groupId: string, updates: Partial<Omit<BotGroup, 'id' | 'ownerUserId'>>): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    // Consider adding a check here to ensure the currentUser is the owner before allowing update
    await updateDoc(groupDocRef, updates);
    console.log(`Bot group with ID: ${groupId} updated.`);
  } catch (error) {
    console.error(`Error updating bot group ${groupId} in Firestore:`, error);
    throw new Error('Failed to update bot group.');
  }
}

/**
 * Retrieves all bot groups where the given user ID is the owner.
 */
export async function getOwnedBotGroupsFromFirestore(userId: string): Promise<BotGroup[]> {
  try {
    const q = query(botGroupsCollectionRef, where('ownerUserId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const botGroups: BotGroup[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      botGroups.push({
        id: docSnap.id,
        name: data.name,
        ownerUserId: data.ownerUserId,
        description: data.description,
        avatarUrl: data.avatarUrl,
        botIds: data.botIds || [],
        memberUserIds: data.memberUserIds || [],
      } as BotGroup);
    });
    return botGroups;
  } catch (error) {
    console.error('Error retrieving owned bot groups from Firestore:', error);
    return [];
  }
}

/**
 * Retrieves all bot groups where the given user ID is listed in memberUserIds.
 * (Future use if human users can be direct members of bot groups for chat purposes)
 */
export async function getMemberBotGroupsFromFirestore(userId: string): Promise<BotGroup[]> {
  try {
    // This query finds groups where the user is a member, excluding those they own (if desired)
    const q = query(botGroupsCollectionRef, 
      where('memberUserIds', 'array-contains', userId)
      // Optionally add: where('ownerUserId', '!=', userId) if owners shouldn't appear as members
    );
    const querySnapshot = await getDocs(q);
    
    const botGroups: BotGroup[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      botGroups.push({
        id: docSnap.id,
        name: data.name,
        ownerUserId: data.ownerUserId,
        description: data.description,
        avatarUrl: data.avatarUrl,
        botIds: data.botIds || [],
        memberUserIds: data.memberUserIds || [],
      } as BotGroup);
    });
    return botGroups;
  } catch (error) {
    console.error('Error retrieving member bot groups from Firestore:', error);
    return [];
  }
}


/**
 * Retrieves a single bot group by its ID from Firestore.
 */
export async function getBotGroupFromFirestore(groupId: string): Promise<BotGroup | null> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(groupDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        ownerUserId: data.ownerUserId,
        description: data.description,
        avatarUrl: data.avatarUrl,
        botIds: data.botIds || [],
        memberUserIds: data.memberUserIds || [],
      } as BotGroup;
    }
    console.log(`No bot group found with ID: ${groupId}.`);
    return null;
  } catch (error) {
    console.error(`Error retrieving bot group ${groupId} from Firestore:`, error);
    return null; // Return null on error
  }
}

/**
 * Deletes a specific bot group from Firestore.
 * Note: Implement permission check in UI or via Firebase Rules to ensure only owner can delete.
 */
export async function deleteBotGroupFromFirestore(groupId: string): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    await deleteDoc(groupDocRef);
    console.log(`Bot group with ID: ${groupId} deleted.`);
  } catch (error) {
    console.error('Error deleting bot group from Firestore:', error);
    throw new Error('Failed to delete bot group.');
  }
}

/**
 * Adds a bot to a group's botIds array.
 */
export async function addBotToGroupInFirestore(groupId: string, botId: string): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    // Consider checks: is botId valid? is bot public or owned by group owner?
    await updateDoc(groupDocRef, {
      botIds: arrayUnion(botId)
    });
    console.log(`Bot ${botId} added to group ${groupId}.`);
  } catch (error) {
    console.error(`Error adding bot ${botId} to group ${groupId}:`, error);
    throw new Error('Failed to add bot to group.');
  }
}

/**
 * Removes a bot from a group's botIds array.
 */
export async function removeBotFromGroupInFirestore(groupId: string, botId: string): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    await updateDoc(groupDocRef, {
      botIds: arrayRemove(botId)
    });
    console.log(`Bot ${botId} removed from group ${groupId}.`);
  } catch (error) {
    console.error(`Error adding bot ${botId} to group ${groupId}:`, error);
    throw new Error('Failed to add bot to group.');
  }
}
