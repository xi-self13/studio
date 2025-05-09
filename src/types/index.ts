export interface User {
  id: string;
  name: string;
  avatarUrl?: string; // URL to user's avatar image
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
      sourceShapeId?: string; // ID of the shape that was part of the prompt
    };

export interface Message {
  id: string;
  userId: string; // ID of the user who sent the message, or 'AI_BOT'
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
}
