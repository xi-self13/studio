
export interface User {
  uid: string; // Firebase User ID or custom Bot ID
  name: string | null; 
  avatarUrl?: string | null; 
  email?: string | null; // Firebase email, optional for bots
  isBot?: boolean; 
  dataAiHint?: string; 
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
      textResponse: string; // Text response from the AI
      prompt?: string; // Original user prompt that led to this AI response
      sourceShapeId?: string; // ID of the shape that was part of the prompt context
    };

export interface Message {
  id: string;
  userId: string; // uid of the user/bot
  channelId: string;
  content: MessageContent;
  timestamp: number; // Unix timestamp
  reactions?: { [emoji: string]: string[] }; // emoji: list of user IDs
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
}

// Configuration for a user-created bot
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

// Configuration for a platform-available AI model/shape or a public user bot
export interface PlatformShape {
  id: string; 
  name: string; 
  description: string;
  avatarUrl?: string;
  dataAiHint?: string;
  shapeUsername: string; 
  tags?: string[];
  isUserCreated?: boolean; 
  ownerDisplayName?: string; 
}

// Configuration for a group of bots
export interface BotGroup {
  id: string;
  name: string;
  ownerUserId: string; // Firebase UID of the user who created and owns this group
  description?: string;
  avatarUrl?: string;
  botIds: string[];      // Array of BotConfig IDs that are members of this group
  memberUserIds: string[]; // Array of User UIDs (besides owner) who are members of this group (future use for multi-user groups)
}
