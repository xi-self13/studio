
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

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Initialize currentUser as null
  const [users, setUsers] = useState<User[]>([]); // Initialize users as empty array

  const { toast } = useToast();

  // Placeholder: In a real app, you would fetch current user, channels, DMs, users, etc.
  // For now, we can set a mock current user after a delay to simulate login, or leave it null.
  useEffect(() => {
    // Simulate fetching user data after a short delay
    const timer = setTimeout(() => {
      const fetchedUser: User = {
        id: 'user_placeholder_1',
        name: 'Demo User',
        avatarUrl: 'https://picsum.photos/seed/demouser/40/40',
      };
      setCurrentUser(fetchedUser);
      setUsers([fetchedUser]); // Add current user to the list of users

      // Simulate fetching some channels for demo purposes if needed, or leave empty
      const fetchedChannels: Channel[] = [
        { id: 'general', name: 'general', type: 'channel', icon: Hash },
        { id: 'shapes-ai', name: 'shapes-ai-chat', type: 'channel', icon: Bot },
      ];
      setChannels(fetchedChannels);
      if (fetchedChannels.length > 0) {
        setActiveChannelId(fetchedChannels[0].id);
         // Optionally, load some placeholder messages for the first channel
        setMessages([
          { id: 'welcome_msg', channelId: fetchedChannels[0].id, userId: 'AI_BOT', content: {type: 'text', text: 'Welcome to ShapeTalk! Select a channel or talk to the AI.'}, timestamp: Date.now() }
        ]);
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
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      userId: currentUser.id,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendAiResponseMessage = async (channelId: string, aiData: { textResponse: string; prompt: string; sourceShapeId: string }) => {
     if (!channelId) {
      toast({ title: "Channel Error", description: "No active channel selected to send the AI response.", variant: "destructive" });
      return;
    }
    const newMessage: Message = {
      id: `ai_msg_${Date.now()}`,
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
    // For demonstration, let's add a new channel
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
