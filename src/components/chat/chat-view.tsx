
"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, User, Channel, BotConfig, TypingIndicator } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { AiChatDialog } from '@/components/ai/image-generator-dialog'; // This seems to be misnamed, it's an AI Chat dialog
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Hash, Users, AtSign, MessageCircle, Sparkles, Bot, Settings, Trash2, Users2 as BotGroupsIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface ChatViewProps {
  activeChannel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  users: User[];
  userBots: BotConfig[];
  onSendMessage: (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => Promise<void>;
  onSendAiResponseMessage: (channelId: string, responseData: { textResponse: string; prompt: string; sourceShapeId: string }) => Promise<void>;
  onOpenBotSettings: (botId: string) => void;
  onDeleteBot: (botId: string) => Promise<void>; 
  onOpenManageGroupDialog?: (groupId: string) => void; 
  onUserTyping: (isTyping: boolean) => void; // New prop
  typingUsers: TypingIndicator[]; // New prop
}

export function ChatView({
  activeChannel,
  messages,
  currentUser,
  users,
  userBots,
  onSendMessage,
  onSendAiResponseMessage,
  onOpenBotSettings,
  onDeleteBot,
  onOpenManageGroupDialog,
  onUserTyping,
  typingUsers,
}: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isAiChatDialogOpen, setIsAiChatDialogOpen] = useState(false);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, activeChannel, typingUsers]); // Added typingUsers to dependencies

  const handleOpenAiShapeChatDialog = () => {
    if (!currentUser) {
      console.warn("User not logged in. Cannot open AI Shape Chat dialog.");
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
            disabled={!currentUser}
        >
           <Sparkles className="mr-2 h-4 w-4" /> Chat with AI about a Shape
         </Button>
         {currentUser && ( 
            <AiChatDialog
                isOpen={isAiChatDialogOpen}
                onOpenChange={setIsAiChatDialogOpen}
                onAiResponse={async (responseData) => {
                  // Ensure activeChannel is not null before trying to access its id
                  if (activeChannel) {
                    onSendAiResponseMessage(activeChannel.id, responseData);
                  } else {
                    // Handle the case where activeChannel is null, perhaps show a toast
                    console.error("Cannot send AI response, no active channel selected.");
                  }
                }}
                currentUserId={currentUser?.uid}
                activeChannelId={activeChannel?.id || null} // Pass null if activeChannel is null
            />
         )}
      </div>
    );
  }

  const currentChannelMessages = messages;

  const getUserById = (userId: string): User | { uid: string, name: string, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string } => {
    const foundUser = users.find(u => u.uid === userId);
    if (foundUser) return foundUser;
    const foundBotConfig = userBots.find(b => b.id === userId);
    if (foundBotConfig) return { uid: userId, name: foundBotConfig.name, avatarUrl: foundBotConfig.avatarUrl, isBot: true, dataAiHint: 'bot avatar'};
    return { uid: userId, name: 'Unknown User', isBot: false, dataAiHint: 'unknown user', avatarUrl: null };
  };

  const getChannelIcon = () => {
    if (!activeChannel) return <Hash className="h-5 w-5 mr-2 text-muted-foreground" />;
    if (activeChannel.type === 'dm') {
      const otherUserId = activeChannel.members?.find(id => id !== currentUser?.uid);
      const otherUser = otherUserId && users.length > 0 ? users.find(u => u.uid === otherUserId) : null;


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
    if (activeChannel.isBotGroup) {
      return <BotGroupsIcon className="h-5 w-5 mr-2 text-muted-foreground" />;
    }
    return activeChannel.icon ? <activeChannel.icon className="h-5 w-5 mr-2 text-muted-foreground" /> : <Hash className="h-5 w-5 mr-2 text-muted-foreground" />;
  };

  const isOwnBotChannel = activeChannel.isBotChannel &&
                          activeChannel.botId &&
                          userBots.some(bot => bot.id === activeChannel.botId && bot.ownerUserId === currentUser.uid);

  const isOwnBotGroupChannel = activeChannel.isBotGroup && activeChannel.groupId && onOpenManageGroupDialog;
  
  const typingUsersText = typingUsers
    .filter(tu => tu.userId !== currentUser.uid) // Don't show self-typing
    .map(tu => tu.userName)
    .join(', ');

  return (
    <div className="flex-1 flex flex-col bg-background h-full max-h-screen">
      <header className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center">
          {getChannelIcon()}
          <h2 className="text-lg font-semibold text-foreground">{activeChannel.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isOwnBotChannel && activeChannel.botId && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenBotSettings(activeChannel.botId!)}
                aria-label="Bot Settings"
                className="text-muted-foreground hover:text-primary"
              >
                <Settings size={20} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete Bot"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={20} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete the bot &quot;{activeChannel.name}&quot;. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (activeChannel.botId) await onDeleteBot(activeChannel.botId)
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Bot
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {isOwnBotGroupChannel && activeChannel.groupId && onOpenManageGroupDialog && (
             <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenManageGroupDialog(activeChannel.groupId!)}
                aria-label="Manage Group Settings"
                className="text-muted-foreground hover:text-primary"
              >
                <Settings size={20} />
              </Button>
          )}
        </div>
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
                isOwnMessage={currentUser ? msg.userId === currentUser.uid : false}
              />
            );
          })}
        </div>
      </ScrollArea>
      
      {typingUsersText && (
        <div className="px-4 pb-1 pt-0 text-xs text-muted-foreground italic h-5">
          {typingUsersText} {typingUsers.length > 1 ? 'are' : 'is'} typing...
        </div>
      )}

      <MessageInput
        onSendMessage={(content) => onSendMessage(activeChannel.id, content)}
        onOpenAiChat={handleOpenAiShapeChatDialog}
        disabled={!activeChannel || !currentUser}
        onUserTyping={onUserTyping}
      />
      {activeChannel && currentUser && (
        <AiChatDialog
          isOpen={isAiChatDialogOpen}
          onOpenChange={setIsAiChatDialogOpen}
          onAiResponse={(responseData) => {
              if (activeChannel?.id) {
                   onSendAiResponseMessage(activeChannel.id, responseData);
              }
          }}
          currentUserId={currentUser?.uid}
          activeChannelId={activeChannel?.id || null}
        />
      )}
    </div>
  );
}

    