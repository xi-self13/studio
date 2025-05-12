// src/lib/firestoreService.ts

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
  arrayRemove,
  serverTimestamp,
  writeBatch,
  Timestamp,
  orderBy,
  onSnapshot,
  Unsubscribe,
  limit
} from 'firebase/firestore'; 
import type { BotConfig, PlatformShape, BotGroup, TypingIndicator, User, Message, Channel } from '@/types'; 

const USER_BOTS_COLLECTION = 'userBots'; 
const PLATFORM_SHAPES_COLLECTION = 'platformShapes'; 
const BOT_GROUPS_COLLECTION = 'botGroups';
export const TYPING_INDICATORS_COLLECTION = 'typingIndicators'; 
const USERS_COLLECTION = 'users';
const MESSAGES_COLLECTION = 'messages';
const CHANNELS_COLLECTION = 'channels';


// --- User Profile Functions ---
export async function updateUserProfileInFirestore(userId: string, profileData: Partial<User>): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const dataToUpdate: any = {};
    // Only include fields that are explicitly provided in profileData
    if ('name' in profileData) dataToUpdate.name = profileData.name;
    if ('avatarUrl' in profileData) dataToUpdate.avatarUrl = profileData.avatarUrl === '' ? null : profileData.avatarUrl;
    if ('statusMessage' in profileData) dataToUpdate.statusMessage = profileData.statusMessage === '' ? null : profileData.statusMessage;
    if ('shapesIncApiKey' in profileData) dataToUpdate.shapesIncApiKey = profileData.shapesIncApiKey === '' ? null : profileData.shapesIncApiKey;
    if ('shapesIncUsername' in profileData) dataToUpdate.shapesIncUsername = profileData.shapesIncUsername === '' ? null : profileData.shapesIncUsername;
    if ('linkedAccounts' in profileData) dataToUpdate.linkedAccounts = profileData.linkedAccounts;
    if ('lastSeen' in profileData) dataToUpdate.lastSeen = profileData.lastSeen ? Timestamp.fromMillis(profileData.lastSeen) : null;


    await updateDoc(userDocRef, dataToUpdate);
    console.log(`User profile for ${userId} updated.`);
  } catch (error) {
    console.error('Error updating user profile in Firestore:', error);
    throw new Error('Failed to update user profile.');
  }
}

export async function createUserDocument(userData: User): Promise<void> {
    const userDocRef = doc(db, USERS_COLLECTION, userData.uid);
    try {
        await setDoc(userDocRef, {
            uid: userData.uid,
            email: userData.email || null,
            name: userData.name || 'Anonymous User',
            avatarUrl: userData.avatarUrl || null,
            isBot: userData.isBot || false,
            statusMessage: userData.statusMessage || null,
            shapesIncApiKey: userData.shapesIncApiKey || null,
            shapesIncUsername: userData.shapesIncUsername || null,
            linkedAccounts: userData.linkedAccounts || [],
            lastSeen: serverTimestamp(), // Set initial lastSeen
        });
    } catch (error) {
        console.error("Error creating user document:", error);
        throw new Error("Failed to create user document.");
    }
}

export async function updateUserLastSeen(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, { lastSeen: serverTimestamp() });
  } catch (error) {
    console.error(`Error updating lastSeen for user ${userId}:`, error);
    // Non-critical, so don't throw
  }
}

export async function getAllAppUsers(): Promise<User[]> {
  try {
    const usersCollectionRef = collection(db, USERS_COLLECTION);
    const q = query(usersCollectionRef, where('isBot', '!=', true)); // Exclude bots
    const querySnapshot = await getDocs(q);
    
    const appUsers: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      appUsers.push({
        uid: docSnap.id,
        name: data.name,
        avatarUrl: data.avatarUrl,
        email: data.email,
        isBot: data.isBot || false,
        statusMessage: data.statusMessage,
        lastSeen: data.lastSeen ? (data.lastSeen as Timestamp).toMillis() : null,
        linkedAccounts: data.linkedAccounts,
        shapesIncApiKey: data.shapesIncApiKey,
        shapesIncUsername: data.shapesIncUsername,
      });
    });
    return appUsers;
  } catch (error) {
    console.error('Error retrieving all app users from Firestore:', error);
    return [];
  }
}


// --- BotConfig Functions --- 

export async function saveUserBotConfigToFirestore(botConfig: BotConfig): Promise<void> {
  try {
    const botDocRef = doc(db, USER_BOTS_COLLECTION, botConfig.id);
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
        apiKey: data.apiKey, 
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
    return []; 
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
        apiKey: data.apiKey, 
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
       const data = docSnap.data();
      publicBots.push({
        id: docSnap.id,
        name: data.name,
        shapeUsername: data.shapeUsername,
        apiKey: '***', 
        ownerUserId: data.ownerUserId,
        avatarUrl: data.avatarUrl,
        isPublic: true, 
        systemPrompt: data.systemPrompt, 
        greetingMessage: data.greetingMessage,
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
      shapes.push({ 
        id: docSnap.id, 
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        dataAiHint: data.dataAiHint,
        shapeUsername: data.shapeUsername,
        tags: data.tags || [],
        isUserCreated: false, 
        ownerDisplayName: 'Platform', 
      } as PlatformShape);
    });
    return shapes;
  } catch (error) {
    console.error('Error retrieving platform shapes from Firestore:', error);
    return []; 
  }
}

export async function addPlatformShapeToFirestore(shapeData: Omit<PlatformShape, 'isUserCreated' | 'ownerDisplayName'> & { id?: string }): Promise<PlatformShape> {
  try {
    let docRef;
    let idToUse = shapeData.id;

    const dataForFirestore: any = { ...shapeData };
    if (idToUse) {
      delete dataForFirestore.id; 
      docRef = doc(db, PLATFORM_SHAPES_COLLECTION, idToUse);
      await setDoc(docRef, dataForFirestore);
    } else {
      const { id, ...dataWithoutId } = shapeData; 
      docRef = await addDoc(collection(db, PLATFORM_SHAPES_COLLECTION), dataWithoutId);
      idToUse = docRef.id;
    }
    
    return { ...shapeData, id: idToUse!, isUserCreated: false, ownerDisplayName: 'Platform' } as PlatformShape;
  } catch (error) {
    console.error('Error adding/updating platform shape to Firestore:', error);
    throw new Error('Failed to add/update platform shape.');
  }
}

export async function seedPlatformShapes() {
  const shapesToSeed: Array<Omit<PlatformShape, 'isUserCreated' | 'ownerDisplayName'> & { id?: string }> = [
    {
      id: 'artemis-ai-official', 
      name: 'Artemis AI',
      description: 'A creative AI that excels at visual concepts and artistic ideas. She is very friendly and loves to help with art projects.',
      shapeUsername: 'artemis_official', 
      avatarUrl: 'https://picsum.photos/seed/artemisai/100/100',
      dataAiHint: 'female robot',
      tags: ['creative', 'visual', 'art', 'friendly'],
    },
    {
      id: 'scholar-bot-prime',
      name: 'Scholar Bot Prime',
      description: 'A knowledgeable AI assistant for research and learning. Always formal and precise in its responses.',
      shapeUsername: 'scholar_prime', 
      avatarUrl: 'https://picsum.photos/seed/scholarbot/100/100',
      dataAiHint: 'wise owl',
      tags: ['knowledge', 'research', 'education', 'formal'],
    },
  ];

  let seededCount = 0;
  for (const shape of shapesToSeed) {
    try {
      // Check if shape already exists by ID
      const existingShapeDoc = await getDoc(doc(db, PLATFORM_SHAPES_COLLECTION, shape.id!));
      if (!existingShapeDoc.exists()) {
        await addPlatformShapeToFirestore(shape);
        seededCount++;
      }
    } catch (e) {
      console.error(`Failed to seed shape ${shape.name}:`, e);
    }
  }
  if (seededCount > 0) {
    console.log(`Successfully seeded ${seededCount} new platform shapes.`);
  } else {
    console.log("Platform shapes already seeded or no new shapes to seed.");
  }
}


// --- BotGroup Functions --- 

const botGroupsCollectionRef = collection(db, BOT_GROUPS_COLLECTION);

export async function createBotGroup(groupData: Omit<BotGroup, 'id'>): Promise<BotGroup> {
  try {
    const docRef = await addDoc(botGroupsCollectionRef, {
      ...groupData,
      botIds: groupData.botIds || [], 
      memberUserIds: groupData.memberUserIds || [], 
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

export async function updateBotGroup(groupId: string, updates: Partial<Omit<BotGroup, 'id' | 'ownerUserId'>>): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    await updateDoc(groupDocRef, updates);
    console.log(`Bot group with ID: ${groupId} updated.`);
  } catch (error) {
    console.error(`Error updating bot group ${groupId} in Firestore:`, error);
    throw new Error('Failed to update bot group.');
  }
}

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

export async function getMemberBotGroupsFromFirestore(userId: string): Promise<BotGroup[]> {
  try {
    const q = query(botGroupsCollectionRef, 
      where('memberUserIds', 'array-contains', userId)
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
    return null; 
  }
}

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

export async function addBotToGroupInFirestore(groupId: string, botId: string): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    await updateDoc(groupDocRef, {
      botIds: arrayUnion(botId)
    });
    console.log(`Bot ${botId} added to group ${groupId}.`);
  } catch (error) {
    console.error(`Error adding bot ${botId} to group ${groupId}:`, error);
    throw new Error('Failed to add bot to group.');
  }
}

export async function removeBotFromGroupInFirestore(groupId: string, botId: string): Promise<void> {
  try {
    const groupDocRef = doc(db, BOT_GROUPS_COLLECTION, groupId);
    await updateDoc(groupDocRef, {
      botIds: arrayRemove(botId)
    });
    console.log(`Bot ${botId} removed from group ${groupId}.`);
  } catch (error) {
    console.error(`Error removing bot ${botId} from group ${groupId}:`, error); 
    throw new Error('Failed to remove bot from group.'); 
  }
}

// --- Channel Functions (especially for DMs) ---
export async function getOrCreateDmChannelBetweenUsers(user1Uid: string, user2Uid: string, user2Name: string): Promise<Channel> {
  const uids = [user1Uid, user2Uid].sort();
  const channelId = `dm_${uids[0]}_${uids[1]}`;
  
  const channelDocRef = doc(db, CHANNELS_COLLECTION, channelId);
  const channelSnap = await getDoc(channelDocRef);

  if (channelSnap.exists()) {
    const data = channelSnap.data();
    return {
      id: channelSnap.id,
      name: data.name,
      type: data.type,
      members: data.members,
      isUserDm: data.isUserDm,
    } as Channel;
  } else {
    const newChannelData: Channel = {
      id: channelId,
      name: user2Name, // Name of the other user in the DM
      type: 'dm',
      members: [user1Uid, user2Uid],
      isUserDm: true, // Mark as a user-to-user DM
    };
    await setDoc(channelDocRef, {
        ...newChannelData,
        createdAt: serverTimestamp(), // Add a creation timestamp
    });
    return newChannelData;
  }
}


// --- Message Functions ---
export async function saveMessageToFirestore(message: Message): Promise<void> {
  try {
    const messageDocRef = doc(db, MESSAGES_COLLECTION, message.id);
    await setDoc(messageDocRef, {
      ...message,
      timestamp: Timestamp.fromMillis(message.timestamp), 
    });
  } catch (error) {
    console.error('Error saving message to Firestore:', error);
  }
}

export function subscribeToChannelMessages(
  channelId: string,
  onMessagesUpdate: (messages: Message[]) => void
): Unsubscribe {
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const q = query(messagesRef, where('channelId', '==', channelId), orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        userId: data.userId,
        channelId: data.channelId,
        content: data.content,
        timestamp: (data.timestamp as Timestamp).toMillis(), 
        reactions: data.reactions,
      } as Message);
    });
    onMessagesUpdate(messages);
  }, (error) => {
    console.error(`Error listening to messages for channel ${channelId}:`, error);
  });

  return unsubscribe;
}


// --- Typing Indicator Functions ---

export async function setTypingIndicatorInFirestore(typingIndicator: TypingIndicator): Promise<void> {
  try {
    const indicatorDocRef = doc(db, TYPING_INDICATORS_COLLECTION, `${typingIndicator.channelId}_${typingIndicator.userId}`);
    await setDoc(indicatorDocRef, {
      ...typingIndicator,
      timestamp: serverTimestamp() 
    });
  } catch (error) {
    console.error('Error setting typing indicator:', error);
  }
}

export async function removeTypingIndicatorFromFirestore(channelId: string, userId: string): Promise<void> {
  try {
    const indicatorDocRef = doc(db, TYPING_INDICATORS_COLLECTION, `${channelId}_${userId}`);
    await deleteDoc(indicatorDocRef);
  } catch (error) {
    console.error('Error removing typing indicator:', error);
  }
}

export async function cleanupOldTypingIndicators(timeoutMillis: number = 5000): Promise<void> {
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - timeoutMillis);
    const q = query(collection(db, TYPING_INDICATORS_COLLECTION), where('timestamp', '<', cutoff));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old typing indicators.`);
  } catch (error) {
    console.error('Error cleaning up old typing indicators:', error);
  }
}

    
