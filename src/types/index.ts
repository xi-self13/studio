
export interface User {
  uid: string; 
  name: string | null; 
  username?: string | null; 
  avatarUrl?: string | null; 
  email?: string | null; // Made optional. Will store dummy email for username-only auth.
  isBot?: boolean; 
  dataAiHint?: string; 
  statusMessage?: string; 
  linkedAccounts?: Array<{ providerId: string; displayName?: string | null; email?: string | null; uid?: string; }>;
  shapesIncApiKey?: string;
  shapesIncUsername?: string;
  lastSeen?: number | null; 
  entityType?: 'user'; 
  isFounder?: boolean; 
  hasSetUsername?: boolean; 
}

export interface Shape {
  id: string;
  name: string;
  svgString: string; 
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
  isUserDm?: boolean; 
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

export interface PlatformShape {
  id: string; 
  name: string; 
  description: string;
  avatarUrl?: string;
  dataAiHint?: string;
  shapeUsername: string; 
  tags?: string[];
  isUserCreated: boolean; 
  ownerDisplayName?: string; 
}


export interface DiscoverableEntity {
  id: string; 
  name: string;
  username?: string; 
  description?: string; 
  avatarUrl?: string | null;
  dataAiHint?: string;
  entityType: 'user' | 'bot' | 'platformAI';
  tags: string[]; 
  shapeUsername?: string;
  ownerDisplayName?: string;
  statusMessage?: string;
  isFounder?: boolean; 
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

