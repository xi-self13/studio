
"use client";

import { useState, useEffect } from 'react';
import type { Channel, Message, User } from '@/types';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { ChatView } from '@/components/chat/chat-view';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Hash, Bot, Users } from 'lucide-react'; // Icons for channels
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES, getShapeById } from '@/lib/shapes';

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchedUser: User = {
        id: 'user_placeholder_1',
        name: 'Demo User',
        avatarUrl: 'https://picsum.photos/seed/demouser/40/40',
      };
      setCurrentUser(fetchedUser);
      setUsers([fetchedUser]);

      const fetchedChannels: Channel[] = [
        { id: 'general', name: 'general', type: 'channel', icon: Hash },
        { id: 'shapes-ai', name: 'shapes-ai-chat', type: 'channel', icon: Bot },
      ];
      setChannels(fetchedChannels);
      if (fetchedChannels.length > 0) {
        setActiveChannelId(fetchedChannels[0].id);
        // Removed initial mock message
        // setMessages([
        //   { id: 'welcome_msg', channelId: fetchedChannels[0].id, userId: 'AI_BOT', content: {type: 'text', text: 'Welcome to ShapeTalk! Select a channel or talk to the AI.'}, timestamp: Date.now() }
        // ]);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);


  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    // Potentially clear messages or fetch messages for the new channel here
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

    // Bot response logic
    const currentChannel = [...channels, ...directMessages].find(c => c.id === channelId);
    if (currentChannel && currentChannel.icon === Bot && content.type === 'text') {
      try {
        // The Shapes API requires a shapeId for context. Use a default one for general bot chat.
        const defaultShapeForBot = PREDEFINED_SHAPES[0];
        if (!defaultShapeForBot) {
          console.error("No predefined shapes available for bot context.");
          toast({ title: "Bot Error", description: "Bot could not determine a shape context.", variant: "destructive" });
          return;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          shapeId: defaultShapeForBot.id,
          userId: currentUser.id, // The user who initiated the interaction with the bot
          channelId: channelId,   // The channel where the interaction is happening
        });

        await handleSendAiResponseMessage(channelId, {
          textResponse: aiResponse.responseText,
          prompt: content.text,
          sourceShapeId: defaultShapeForBot.id,
        });

      } catch (error) {
        console.error("Error getting AI response for bot chat:", error);
        toast({
          title: "AI Bot Error",
          description: error instanceof Error ? error.message : "The bot encountered an issue and could not respond.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendAiResponseMessage = async (channelId: string, aiData: { textResponse: string; prompt: string; sourceShapeId: string }) => {
     if (!channelId) {
      toast({ title: "Channel Error", description: "No active channel selected to send the AI response.", variant: "destructive" });
      return;
    }
    const newMessage: Message = {
      id: `ai_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: 'AI_BOT',
      content: { 
        type: 'ai_response', 
        textResponse: aiData.textResponse,
        prompt: aiData.prompt,
        sourceShapeId: aiData.sourceShapeId,
      },
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
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
