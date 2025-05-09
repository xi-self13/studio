"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Channel, Message, User } from '@/types';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { ChatView } from '@/components/chat/chat-view';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Hash, Bot } from 'lucide-react'; 
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES, getShapeById } from '@/lib/shapes';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';

const BOT_CHANNEL_ID = 'shapes-ai';
const AI_BOT_USER_ID = 'AI_BOT';

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [hasSentInitialBotMessageForChannel, setHasSentInitialBotMessageForChannel] = useState<Record<string, boolean>>({});


  const { toast } = useToast();

  const sendBotMessageUtil = useCallback((channelId: string, text: string, type: 'text' | 'ai_response' = 'text', prompt?: string, sourceShapeId?: string) => {
    const botMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: AI_BOT_USER_ID,
      content: type === 'ai_response' ? { type, textResponse: text, prompt, sourceShapeId } : { type, text },
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, botMessage]);
  }, []);


  useEffect(() => {
    const initializeApp = async () => {
      const fetchedUser: User = {
        id: `user_${Date.now()}`, // More unique ID
        name: 'Demo User',
        avatarUrl: 'https://picsum.photos/seed/demouser/40/40',
      };
      setCurrentUser(fetchedUser);
      setUsers([fetchedUser, { id: AI_BOT_USER_ID, name: 'Shape AI', avatarUrl: 'https://picsum.photos/seed/shapeai/40/40' }]);

      const fetchedChannels: Channel[] = [
        { id: 'general', name: 'general', type: 'channel', icon: Hash },
        { id: BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'channel', icon: Bot },
      ];
      setChannels(fetchedChannels);
      if (fetchedChannels.length > 0 && !activeChannelId) {
         setActiveChannelId(fetchedChannels[0].id);
      }

      const healthStatus = await checkShapesApiHealth();
      setIsApiHealthy(healthStatus.healthy);

      if (!healthStatus.healthy) {
        toast({
          title: "Shapes API Issue",
          description: healthStatus.error || "The Shapes API is currently unavailable. Bot functionality will be limited.",
          variant: "destructive",
          duration: 10000, // Keep toast longer for important messages
        });
      }
    };

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // activeChannelId removed as it's set within this effect


  useEffect(() => {
    if (isApiHealthy && activeChannelId === BOT_CHANNEL_ID && !hasSentInitialBotMessageForChannel[BOT_CHANNEL_ID] && currentUser) {
      const botMessagesInChannel = messages.filter(msg => msg.channelId === BOT_CHANNEL_ID && msg.userId === AI_BOT_USER_ID);
      if (botMessagesInChannel.length === 0) { // Only send if bot hasn't spoken in this channel yet
        sendBotMessageUtil(BOT_CHANNEL_ID, "Hello! I'm the Shape AI, powered by Shapes.inc. How can I help you today?");
        setHasSentInitialBotMessageForChannel(prev => ({ ...prev, [BOT_CHANNEL_ID]: true }));
      }
    }
  }, [isApiHealthy, activeChannelId, currentUser, sendBotMessageUtil, hasSentInitialBotMessageForChannel, messages]);


  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    // No need to reset hasSentInitialBotMessageForChannel here, initial message logic will re-evaluate
  };

  const handleSendMessage = async (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to send messages.", variant: "destructive" });
      return;
    }
    if (!channelId) {
      toast({ title: "Channel Error", description: "No active channel selected to send the message.", variant: "destructive" });
      return;
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: currentUser.id,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);

    const currentChannel = [...channels, ...directMessages].find(c => c.id === channelId);
    if (currentChannel && currentChannel.id === BOT_CHANNEL_ID && content.type === 'text') {
      if (!isApiHealthy) {
        sendBotMessageUtil(channelId, "I'm currently unable to connect to my services. Please check the API status or try again later.", "text");
        return;
      }
      try {
        // The Shapes API requires a shapeId for context. Use a default one for general bot chat.
        const defaultShapeForBot = PREDEFINED_SHAPES[0]; 
        if (!defaultShapeForBot) {
          console.error("No predefined shapes available for bot context.");
          sendBotMessageUtil(channelId, "I'm having trouble finding a default context. Please try asking about a specific shape.", "text");
          return;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          shapeId: defaultShapeForBot.id, // API flow requires shapeId
          userId: currentUser.id, 
          channelId: channelId,   
        });
        
        sendBotMessageUtil(channelId, aiResponse.responseText, "ai_response", content.text, defaultShapeForBot.id);

      } catch (error) {
        console.error("Error getting AI response for bot chat:", error);
        const errorMessage = error instanceof Error ? error.message : "The bot encountered an issue and could not respond.";
        toast({
          title: "AI Bot Error",
          description: errorMessage,
          variant: "destructive",
        });
        sendBotMessageUtil(channelId, `Sorry, I couldn't process that: ${errorMessage}`, "text");
      }
    }
  };
  
  const handleSendAiResponseMessage = async (channelId: string, aiData: { textResponse: string; prompt: string; sourceShapeId: string }) => {
     if (!channelId) {
      toast({ title: "Channel Error", description: "No active channel selected to send the AI response.", variant: "destructive" });
      return;
    }
    if (!isApiHealthy && channelId === BOT_CHANNEL_ID) {
      sendBotMessageUtil(channelId, "My services are currently unavailable. Please try again later.", "text");
      // Still show the user's prompt in the dialog if it fails? For now, just a general message.
      return;
    }
    sendBotMessageUtil(channelId, aiData.textResponse, "ai_response", aiData.prompt, aiData.sourceShapeId);
  };
  
  const handleOpenSettings = () => {
    toast({ title: "Settings Clicked", description: "Settings panel would open here." });
  };

  const handleAddChannel = () => {
    const newChannelName = prompt("Enter new channel name:");
    if (newChannelName) {
      const newChannel: Channel = {
        id: `channel_${Date.now()}`,
        name: newChannelName,
        type: 'channel',
        icon: Hash,
      };
      setChannels(prev => [...prev, newChannel]);
      setActiveChannelId(newChannel.id);
      toast({ title: "Channel Added", description: `Channel "${newChannelName}" created.` });
    }
  };

  const activeChannelDetails = [...channels, ...directMessages].find(c => c.id === activeChannelId) || null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        <AppSidebar
          channels={channels}
          directMessages={directMessages}
          currentUser={currentUser}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={handleOpenSettings}
          onAddChannel={handleAddChannel}
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-full max-h-screen relative m-0 rounded-none shadow-none p-0">
          <div className="md:hidden p-2 border-b border-border sticky top-0 bg-background z-20">
             <SidebarTrigger className="h-8 w-8">
                <PanelLeft />
             </SidebarTrigger>
          </div>
          <ChatView
            activeChannel={activeChannelDetails}
            messages={messages}
            currentUser={currentUser}
            users={users}
            onSendMessage={handleSendMessage}
            onSendAiResponseMessage={handleSendAiResponseMessage}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
