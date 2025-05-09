"use client";

import type { Message, User } from '@/types';
import { getShapeById } from '@/lib/shapes';
import { ShapeDisplay } from '@/components/shape/shape-display';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { format } from 'date-fns';
import { Bot } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  sender: User | { id: 'AI_BOT', name: 'AI Bot', avatarUrl?: string };
  isOwnMessage: boolean;
}

export function MessageItem({ message, sender, isOwnMessage }: MessageItemProps) {
  const getSenderName = () => {
    if (sender.id === 'AI_BOT') return 'AI Bot';
    return sender.name;
  }

  const getAvatar = () => {
    if (sender.id === 'AI_BOT') {
      return (
        <Avatar className="h-10 w-10 bg-primary/20">
          <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
        </Avatar>
      );
    }
    return (
      <Avatar className="h-10 w-10">
        <AvatarImage src={sender.avatarUrl} data-ai-hint="user profile" />
        <AvatarFallback>{sender.name.substring(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={`flex gap-3 p-3 hover:bg-muted/30 transition-colors duration-150 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {!isOwnMessage && getAvatar()}
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{getSenderName()}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'p')}
          </span>
        </div>
        <div className={`mt-1 p-2 rounded-lg max-w-md lg:max-w-lg xl:max-w-xl break-words ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : (message.content.type === 'ai_image' ? 'bg-card' : 'bg-secondary text-secondary-foreground')
        }`}>
          {message.content.type === 'text' && <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>}
          {message.content.type === 'shape' && (
            () => {
              const shape = getShapeById(message.content.shapeId);
              return shape ? (
                <ShapeDisplay 
                  svgString={shape.svgString} 
                  size={64} 
                  color={isOwnMessage ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'} 
                />
              ) : (
                <p className="text-sm text-destructive-foreground italic">[Unknown Shape]</p>
              );
            }
          )()}
          {message.content.type === 'ai_image' && (
            <div className="space-y-2">
              {message.content.prompt && (
                 <p className="text-xs italic text-muted-foreground">
                  Prompt: "{message.content.prompt}"
                  {message.content.sourceShapeId && ` with ${getShapeById(message.content.sourceShapeId)?.name || 'shape'}`}
                 </p>
              )}
              {/* Using <img> for data URI as next/image optimization isn't ideal here */}
              <img 
                src={message.content.imageUrl} 
                alt={message.content.prompt || 'AI Generated Image'} 
                className="rounded-md max-w-full h-auto object-contain"
                data-ai-hint="generated art"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}
        </div>
      </div>
      {isOwnMessage && getAvatar()}
    </div>
  );
}
