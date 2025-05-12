export interface User {
  uid: string; // Firebase User ID or custom Bot ID
  name: string | null; 
  avatarUrl?: string | null; 
  email?: string | null; // Firebase email, optional for bots
  isBot?: boolean; 
  dataAiHint?: string; 
  statusMessage?: string; 
  linkedAccounts?: Array<{ providerId: string; displayName?: string | null; email?: string | null }>; // displayName and email can be null
  shapesIncApiKey?: string;
  shapesIncUsername?: string;
  lastSeen?: number | null; // Timestamp of last activity
  entityType?: 'user'; // To help distinguish on discovery pages
}

export interface Shape {
  id: string;
  name: string;
  svgString: string; // Raw SVG string
}

export type MessageContent = 
  | { type: 'text'; text: string }
  | { type: 'shape'; shapeId: string }
  | { 
      type: 'ai_response'; 
      textResponse: string; 
      prompt?: string; 
      sourceShapeId?: string; 
    };

export interface Message {
  id: string;
  userId: string; 
  channelId: string;
  content: MessageContent;
  timestamp: number; 
  reactions?: { [emoji: string]: string[] }; 
}

export interface Channel {
  id: string; 
  name: string;
  type: 'channel' | 'dm' | 'group'; 
  members?: string[]; 
  unreadCount?: number;
  icon?: React.ElementType; 
  isBotChannel?: boolean; 
  botId?: string; 
  isAiLounge?: boolean; 
  isBotGroup?: boolean; 
  groupId?: string;
  isUserDm?: boolean; // Indicates a DM between two regular users
}

export interface BotConfig {
  id: string; 
  name: string;
  shapeUsername: string; 
  apiKey: string; 
  avatarUrl?: string;
  ownerUserId: string; 
  isPublic?: boolean; 
  systemPrompt?: string; 
  greetingMessage?: string; 
}

// Represents an AI entity that can be discovered. Could be a platform-defined AI or a user-created public bot.
export interface PlatformShape {
  id: string; 
  name: string; 
  description: string;
  avatarUrl?: string;
  dataAiHint?: string;
  shapeUsername: string; 
  tags?: string[];
  isUserCreated: boolean; // True if this is a user's public bot, false if official platform AI
  ownerDisplayName?: string; // Only relevant if isUserCreated is true
}


export interface DiscoverableEntity {
  id: string; // User UID or Bot ID or Platform AI ID
  name: string;
  description?: string; // For bots/AIs, or user status/bio
  avatarUrl?: string | null;
  dataAiHint?: string;
  entityType: 'user' | 'bot' | 'platformAI';
  tags: string[]; 
  // Bot/PlatformAI specific
  shapeUsername?: string;
  // User-created bot specific
  ownerDisplayName?: string;
  // User specific (optional)
  statusMessage?: string;
}


export interface BotGroup {
  id: string;
  name: string;
  ownerUserId: string; 
  description?: string;
  avatarUrl?: string;
  botIds: string[];      
  memberUserIds: string[]; 
}

export interface TypingIndicator {
  userId: string;
  userName: string; 
  channelId: string;
  timestamp: number; 
}
