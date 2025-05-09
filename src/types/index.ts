
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
  type: 'channel' | 'dm';
  members?: string[]; // list of user uids (Firebase UIDs for users, bot IDs for bots)
  unreadCount?: number;
  icon?: React.ElementType; 
  isBotChannel?: boolean; 
  botId?: string; 
}

// Configuration for a user-created bot
export interface BotConfig {
  id: string; // Unique ID for the bot, will also be its user ID (uid)
  name: string;
  shapeUsername: string; 
  apiKey: string; 
  avatarUrl?: string;
  ownerUserId: string; // Firebase UID of the user who created this bot
}
