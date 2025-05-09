
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
  currentUser: User | null; // This is now the Firebase User object (or our app's User type derived from it)
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
    setIsAiChatDialogOpen(true);
  };

  if (!activeChannel || !currentUser) {
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
            disabled={!currentUser} // Disable if no current user
        >
           <Sparkles className="mr-2 h-4 w-4" /> Chat with AI about a Shape
         </Button>
         {currentUser && activeChannel && ( // Only render dialog if user and channel potentially exist
            <AiChatDialog 
                isOpen={isAiChatDialogOpen} 
                onOpenChange={setIsAiChatDialogOpen}
                onAiResponse={async (responseData) => {
                  if (activeChannel?.id && currentUser) { // Redundant check but safe
                    onSendAiResponseMessage(activeChannel.id, responseData);
                  } else {
                    console.warn("AI Shape Chat: Response received but no active channel or user to post to.");
                  }
                }}
                currentUserId={currentUser?.uid} // Pass Firebase UID
                activeChannelId={activeChannel?.id || null} 
            />
         )}
         {/* Fallback if no active channel for the dialog when button is clicked from this view */}
         {!activeChannel && currentUser && (
             <AiChatDialog 
                isOpen={isAiChatDialogOpen} 
                onOpenChange={setIsAiChatDialogOpen}
                onAiResponse={async (responseData) => {
                    // This case might need a default channel or user notification
                    console.warn("AI Shape Chat: Response received but no active channel to post to from this context.");
                }}
                currentUserId={currentUser?.uid} // Pass Firebase UID
                activeChannelId={null} // No active channel in this specific view state
            />
         )}
      </div>
    );
  }

  const currentChannelMessages = messages;

  const getUserById = (userId: string): User | { uid: string, name: string, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string } => {
    const foundUser = users.find(u => u.uid === userId);
    if (foundUser) return foundUser;
    return { uid: userId, name: 'Unknown User', isBot: false, dataAiHint: 'unknown user', avatarUrl: null }; 
  };

  const getChannelIcon = () => {
    if (!activeChannel) return <Hash className="h-5 w-5 mr-2 text-muted-foreground" />;
    if (activeChannel.type === 'dm') {
      const otherUserId = activeChannel.members?.find(id => id !== currentUser?.uid);
      const otherUser = otherUserId ? users.find(u => u.uid === otherUserId) : null;

      if (otherUser) {
        return (
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={otherUser.avatarUrl || undefined} data-ai-hint={otherUser.dataAiHint || (otherUser.isBot ? "bot avatar" : "profile user")} />
            <AvatarFallback>
              {otherUser.isBot ? <Bot size={12}/> : (otherUser.name ? otherUser.name.substring(0,1).toUpperCase() : 'U')}
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
                isOwnMessage={currentUser ? msg.userId === currentUser.uid : false} // Use Firebase UID for comparison
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
          currentUserId={currentUser?.uid} // Pass Firebase UID
          activeChannelId={activeChannel?.id || null}
        />
      )}
    </div>
  );
}
