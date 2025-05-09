"use client";

import { useState, useEffect } from 'react';
import type { Channel, Message, User, Shape } from '@/types';
import { PREDEFINED_SHAPES } from '@/lib/shapes';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { ChatView } from '@/components/chat/chat-view';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Hash, Bot, Users } from 'lucide-react'; // Icons for channels

// Mock Data
const mockCurrentUser: User = {
  id: 'user1',
  name: 'You',
  avatarUrl: 'https://picsum.photos/seed/user1/40/40',
};

const mockUsers: User[] = [
  mockCurrentUser,
  { id: 'user2', name: 'Alice', avatarUrl: 'https://picsum.photos/seed/alice/40/40' },
  { id: 'user3', name: 'Bob', avatarUrl: 'https://picsum.photos/seed/bob/40/40' },
  { id: 'AI_BOT', name: 'AI Bot', avatarUrl: '' }, // AI Bot doesn't need a real avatarUrl here
];

const initialChannels: Channel[] = [
  { id: 'general', name: 'general', type: 'channel', icon: Hash },
  { id: 'shapes', name: 'shapes-art', type: 'channel', icon: Bot }, // Using Bot icon for AI-related
  { id: 'random', name: 'random', type: 'channel', icon: Hash },
];

const initialDMs: Channel[] = [
  { id: 'dm_alice', name: 'Alice', type: 'dm', members: ['user1', 'user2'] },
  { id: 'dm_bob', name: 'Bob', type: 'dm', members: ['user1', 'user3'] },
];


export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [directMessages, setDirectMessages] = useState<Channel[]>(initialDMs);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(initialChannels[0]?.id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  // Effect to load some initial messages for demo
  useEffect(() => {
    if(initialChannels[0]) {
      setMessages([
        { id: 'msg1', channelId: initialChannels[0].id, userId: 'user2', content: { type: 'text', text: 'Hello everyone! Welcome to ShapeTalk! 👋' }, timestamp: Date.now() - 200000 },
        { id: 'msg2', channelId: initialChannels[0].id, userId: 'user3', content: { type: 'text', text: 'Hi Alice! This looks cool.' }, timestamp: Date.now() - 100000 },
        { id: 'msg3', channelId: initialChannels[0].id, userId: 'user1', content: { type: 'text', text: 'Indeed! Let\'s try sending some shapes.' }, timestamp: Date.now() - 50000 },
        { id: 'msg4', channelId: initialChannels[0].id, userId: 'user1', content: { type: 'shape', shapeId: PREDEFINED_SHAPES[0].id }, timestamp: Date.now() - 40000 },
      ]);
    }
  }, []);


  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
  };

  const handleSendMessage = async (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      userId: mockCurrentUser.id,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendAiImageMessage = async (channelId: string, imageData: { imageUrl: string; prompt: string; sourceShapeId: string }) => {
    const newMessage: Message = {
      id: `ai_msg_${Date.now()}`,
      channelId,
      userId: 'AI_BOT',
      content: { 
        type: 'ai_image', 
        imageUrl: imageData.imageUrl,
        prompt: imageData.prompt,
        sourceShapeId: imageData.sourceShapeId,
      },
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  const handleOpenSettings = () => {
    toast({ title: "Settings Clicked", description: "Settings panel would open here." });
  };

  const handleAddChannel = () => {
    toast({ title: "Add Channel Clicked", description: "Functionality to add a new channel would be here." });
  };

  const activeChannelDetails = [...channels, ...directMessages].find(c => c.id === activeChannelId) || null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        <AppSidebar
          channels={channels}
          directMessages={directMessages}
          currentUser={mockCurrentUser}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={handleOpenSettings}
          onAddChannel={handleAddChannel}
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-full max-h-screen relative m-0 rounded-none shadow-none p-0">
          {/* This trigger is for mobile/collapsible sidebar if not using the built-in rail */}
          <div className="md:hidden p-2 border-b border-border sticky top-0 bg-background z-20">
             <SidebarTrigger className="h-8 w-8">
                <PanelLeft />
             </SidebarTrigger>
          </div>
          <ChatView
            activeChannel={activeChannelDetails}
            messages={messages}
            currentUser={mockCurrentUser}
            users={mockUsers}
            onSendMessage={handleSendMessage}
            onSendAiImageMessage={handleSendAiImageMessage}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
