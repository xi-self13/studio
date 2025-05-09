"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, User, Channel } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { ImageGeneratorDialog } from '@/components/ai/image-generator-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash, Users, AtSign, Bot } from 'lucide-react';

interface ChatViewProps {
  activeChannel: Channel | null;
  messages: Message[];
  currentUser: User;
  users: User[]; // All users, for fetching sender details
  onSendMessage: (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => Promise<void>;
  onSendAiImageMessage: (channelId: string, imageData: { imageUrl: string; prompt: string; sourceShapeId: string }) => Promise<void>;
}

export function ChatView({ 
  activeChannel, 
  messages, 
  currentUser, 
  users,
  onSendMessage,
  onSendAiImageMessage
}: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  if (!activeChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 text-muted-foreground">
        <MessageCircleIcon className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold">Select a channel to start chatting</h2>
        <p className="text-sm">Or generate an image with our AI!</p>
         <Button onClick={() => setIsImageGeneratorOpen(true)} className="mt-4">Generate AI Image</Button>
         <ImageGeneratorDialog 
            isOpen={isImageGeneratorOpen} 
            onOpenChange={setIsImageGeneratorOpen}
            onImageGenerated={async (imageData) => {
              // Cannot send AI image if no channel is active, handle this scenario
              // For now, let's assume we'd need a default channel or user flow for this
              console.warn("AI Image generated but no active channel to post to.");
            }}
          />
      </div>
    );
  }

  const currentChannelMessages = messages.filter(msg => msg.channelId === activeChannel.id);

  const getUserById = (userId: string): User | { id: 'AI_BOT', name: 'AI Bot', avatarUrl?: string } => {
    if (userId === 'AI_BOT') return { id: 'AI_BOT', name: 'AI Bot' };
    return users.find(u => u.id === userId) || { id: 'unknown', name: 'Unknown User' };
  };

  const getChannelIcon = () => {
    if (activeChannel.type === 'dm') {
      const otherUserName = activeChannel.name.replace(currentUser.name, '').trim();
      const otherUser = users.find(u => u.name === otherUserName);
      if (otherUser) {
        return (
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={otherUser.avatarUrl} data-ai-hint="profile user" />
            <AvatarFallback>{otherUser.name.substring(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
        );
      }
      return <AtSign className="h-5 w-5 mr-2 text-muted-foreground" />;
    }
    return activeChannel.icon ? <activeChannel.icon className="h-5 w-5 mr-2 text-muted-foreground" /> : <Hash className="h-5 w-5 mr-2 text-muted-foreground" />;
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full max-h-screen">
      <header className="p-4 border-b border-border flex items-center sticky top-0 bg-background z-10">
        {getChannelIcon()}
        <h2 className="text-lg font-semibold text-foreground">{activeChannel.name}</h2>
      </header>

      <ScrollArea className="flex-1" viewportRef={viewportRef} ref={scrollAreaRef}>
        <div className="p-4 space-y-1">
          {currentChannelMessages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages in this channel yet.</p>
              <p>Be the first to say something!</p>
            </div>
          )}
          {currentChannelMessages.map(msg => {
            const sender = getUserById(msg.userId);
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                sender={sender}
                isOwnMessage={msg.userId === currentUser.id} 
              />
            );
          })}
        </div>
      </ScrollArea>
      
      <MessageInput 
        onSendMessage={(content) => onSendMessage(activeChannel.id, content)} 
        onOpenImageGenerator={() => setIsImageGeneratorOpen(true)}
      />
      <ImageGeneratorDialog 
        isOpen={isImageGeneratorOpen} 
        onOpenChange={setIsImageGeneratorOpen}
        onImageGenerated={(imageData) => onSendAiImageMessage(activeChannel.id, imageData)}
      />
    </div>
  );
}


function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  )
}
