"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, User, Channel } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { AiChatDialog } from '@/components/ai/image-generator-dialog'; // Path remains same, component name inside is AiChatDialog
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Hash, Users, AtSign, MessageCircle, Sparkles } from 'lucide-react'; // Added MessageCircle, Sparkles

interface ChatViewProps {
  activeChannel: Channel | null;
  messages: Message[];
  currentUser: User;
  users: User[]; // All users, for fetching sender details
  onSendMessage: (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => Promise<void>;
  onSendAiResponseMessage: (channelId: string, responseData: { textResponse: string; prompt: string; sourceShapeId: string }) => Promise<void>;
}

export function ChatView({ 
  activeChannel, 
  messages, 
  currentUser, 
  users,
  onSendMessage,
  onSendAiResponseMessage
}: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isAiChatDialogOpen, setIsAiChatDialogOpen] = useState(false);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  if (!activeChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 text-muted-foreground">
        <MessageCircle className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold">Select a channel to start chatting</h2>
        <p className="text-sm">Or talk to our AI about shapes!</p>
         <Button onClick={() => setIsAiChatDialogOpen(true)} className="mt-4" variant="outline">
           <Sparkles className="mr-2 h-4 w-4" /> Chat with AI
         </Button>
         <AiChatDialog 
            isOpen={isAiChatDialogOpen} 
            onOpenChange={setIsAiChatDialogOpen}
            onAiResponse={async (responseData) => {
              // This case should ideally be prevented by disabling the button if no channel is active.
              // For now, we'll rely on the dialog itself or the button click handler to manage this.
              console.warn("AI Response received but no active channel to post to. This should not happen if button is disabled.");
            }}
            currentUserId={currentUser.id}
            activeChannelId={null} // Pass null if no active channel, dialog should handle this
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
        onOpenAiChat={() => setIsAiChatDialogOpen(true)}
        disabled={!activeChannel}
      />
      {activeChannel && (
        <AiChatDialog 
          isOpen={isAiChatDialogOpen} 
          onOpenChange={setIsAiChatDialogOpen}
          onAiResponse={(responseData) => onSendAiResponseMessage(activeChannel.id, responseData)}
          currentUserId={currentUser.id}
          activeChannelId={activeChannel.id}
        />
      )}
    </div>
  );
}
