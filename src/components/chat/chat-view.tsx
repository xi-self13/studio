
"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, User, Channel } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { AiChatDialog } from '@/components/ai/image-generator-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Hash, Users, AtSign, MessageCircle, Sparkles } from 'lucide-react'; 

interface ChatViewProps {
  activeChannel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  users: User[]; 
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

  const handleOpenAiChat = () => {
    if (!currentUser) {
      // Optionally, show a toast or alert that user needs to be logged in
      console.warn("User not logged in. Cannot open AI Chat dialog.");
      return;
    }
    if (!activeChannel) {
        // If no channel selected, AI chat might be for general purpose or disabled.
        // For this app, let's assume AI chat should be tied to a channel.
        // Or, the AI chat dialog could have a mode where it doesn't post to a channel.
        // For now, we allow opening it but it won't be able to post.
        console.warn("No active channel for AI Chat. Response won't be posted.");
    }
    setIsAiChatDialogOpen(true);
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 text-muted-foreground">
        <MessageCircle className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold">Select a channel to start chatting</h2>
        <p className="text-sm">Or talk to our AI about shapes!</p>
         <Button onClick={handleOpenAiChat} className="mt-4" variant="outline" disabled={!currentUser}>
           <Sparkles className="mr-2 h-4 w-4" /> Chat with AI
         </Button>
         <AiChatDialog 
            isOpen={isAiChatDialogOpen} 
            onOpenChange={setIsAiChatDialogOpen}
            onAiResponse={async (responseData) => {
              // This case is tricky: AI response when no channel is active.
              // The current onSendAiResponseMessage expects a channelId.
              // For now, this dialog will be disabled if no activeChannelId for posting.
              // The button above handles the !currentUser case.
              // If a channelId is truly null here, it means the logic for opening the dialog needs refinement.
              console.warn("AI Response received but no active channel to post to. Response not sent.");
            }}
            currentUserId={currentUser?.id}
            activeChannelId={null} // No active channel, so pass null. Dialog should handle.
          />
      </div>
    );
  }

  const currentChannelMessages = messages.filter(msg => msg.channelId === activeChannel.id);

  const getUserById = (userId: string): User | { id: 'AI_BOT', name: 'AI Bot', avatarUrl?: string } | { id: string, name: string } => {
    if (userId === 'AI_BOT') return { id: 'AI_BOT', name: 'AI Bot' };
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) return foundUser;
    return { id: userId, name: 'Unknown User' };
  };

  const getChannelIcon = () => {
    if (activeChannel.type === 'dm' && currentUser) { // Check currentUser for DM name processing
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
                isOwnMessage={currentUser ? msg.userId === currentUser.id : false} 
              />
            );
          })}
        </div>
      </ScrollArea>
      
      <MessageInput 
        onSendMessage={(content) => onSendMessage(activeChannel.id, content)} 
        onOpenAiChat={handleOpenAiChat}
        disabled={!activeChannel || !currentUser} // Disable if no channel or no user
      />
      {/* AiChatDialog is triggered by MessageInput or the placeholder button */}
      {/* Ensure it gets correct props when activeChannel and currentUser exist */}
      <AiChatDialog 
        isOpen={isAiChatDialogOpen} 
        onOpenChange={setIsAiChatDialogOpen}
        onAiResponse={(responseData) => {
            if (activeChannel?.id) {
                 onSendAiResponseMessage(activeChannel.id, responseData);
            } else {
                console.warn("AI Chat dialog: No active channel ID to send response.");
            }
        }}
        currentUserId={currentUser?.id}
        activeChannelId={activeChannel?.id || null}
      />
    </div>
  );
}
