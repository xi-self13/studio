export interface User {
  id: string;
  name: string;
  avatarUrl?: string; // URL to user's avatar image
  isBot?: boolean; // Flag to indicate if this user is a bot
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
  userId: string; // ID of the user who sent the message, or a bot's ID
  channelId: string;
  content: MessageContent;
  timestamp: number; // Unix timestamp
  reactions?: { [emoji: string]: string[] }; // emoji: list of user IDs
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  members?: string[]; // For DMs or private channels, list of user IDs
  unreadCount?: number;
  icon?: React.ElementType; // Optional: Lucide icon component
  isBotChannel?: boolean; // True if this channel is a DM with a bot
  botId?: string; // If isBotChannel, the ID of the bot
}

// Configuration for a user-created bot
export interface BotConfig {
  id: string; // Unique ID for the bot, will also be its user ID
  name: string;
  shapeUsername: string; // Shapes.inc username for this bot
  apiKey: string; // Shapes.inc API key for this bot (SECURITY_RISK: For demo only, not for production)
  avatarUrl?: string;
  ownerUserId: string; // ID of the user who created this bot
}
