
"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, User, Channel } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { AiChatDialog } from '@/components/ai/image-generator-dialog'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Hash, Users, AtSign, MessageCircle, Sparkles, Bot } from 'lucide-react'; 

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

  const handleOpenAiShapeChatDialog = () => { 
    if (!currentUser) {
      console.warn("User not logged in. Cannot open AI Shape Chat dialog.");
      // Optionally, show a toast to login
      return;
    }
    // No need to check activeChannel here as the dialog itself can be context-less initially,
    // and the action of sending the message from dialog will check for activeChannel.
    setIsAiChatDialogOpen(true);
  };

  if (!activeChannel || !currentUser) { // Ensure currentUser is also checked for main view
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 text-muted-foreground">
        <MessageCircle className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold">
          {currentUser ? "Select a channel to start chatting" : "Please login to chat"}
        </h2>
        {currentUser && <p className="text-sm">Or talk to our AI about shapes!</p>}
         <Button 
            onClick={handleOpenAiShapeChatDialog} 
            className="mt-4" 
            variant="outline" 
            disabled={!currentUser} // Disable if no user
        >
           <Sparkles className="mr-2 h-4 w-4" /> Chat with AI about a Shape
         </Button>
         {/* AiChatDialog is still rendered to be controlled, but button to open it is conditional */}
         <AiChatDialog 
            isOpen={isAiChatDialogOpen} 
            onOpenChange={setIsAiChatDialogOpen}
            onAiResponse={async (responseData) => {
              if (activeChannel?.id && currentUser) { // Ensure active channel & user for sending
                onSendAiResponseMessage(activeChannel.id, responseData);
              } else {
                console.warn("AI Shape Chat: Response received but no active channel or user to post to.");
                // Optionally, show a toast if currentUser is missing.
              }
            }}
            currentUserId={currentUser?.id}
            activeChannelId={activeChannel?.id || null} 
          />
      </div>
    );
  }

  const currentChannelMessages = messages;

  const getUserById = (userId: string): User | { id: string, name: string, avatarUrl?: string, isBot?: boolean, dataAiHint?: string } => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) return foundUser;
    return { id: userId, name: 'Unknown User', isBot: false, dataAiHint: 'unknown user' }; 
  };

  const getChannelIcon = () => {
    if (!activeChannel) return <Hash className="h-5 w-5 mr-2 text-muted-foreground" />;
    if (activeChannel.type === 'dm') {
      const otherUserId = activeChannel.members?.find(id => id !== currentUser?.id);
      const otherUser = otherUserId ? users.find(u => u.id === otherUserId) : null;

      if (otherUser) {
        return (
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={otherUser.avatarUrl} data-ai-hint={otherUser.dataAiHint || (otherUser.isBot ? "bot avatar" : "profile user")} />
            <AvatarFallback>
              {otherUser.isBot ? <Bot size={12}/> : otherUser.name.substring(0,1).toUpperCase()}
            </AvatarFallback>
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
        onOpenAiChat={handleOpenAiShapeChatDialog}
        disabled={!activeChannel || !currentUser} 
      />
      {activeChannel && currentUser && (
        <AiChatDialog 
          isOpen={isAiChatDialogOpen} 
          onOpenChange={setIsAiChatDialogOpen}
          onAiResponse={(responseData) => {
              if (activeChannel?.id) { 
                   onSendAiResponseMessage(activeChannel.id, responseData);
              } else {
                  console.warn("AI Shape Chat dialog: No active channel ID to send response.");
              }
          }}
          currentUserId={currentUser?.id}
          activeChannelId={activeChannel?.id || null}
        />
      )}
    </div>
  );
}

