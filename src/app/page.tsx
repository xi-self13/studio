
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Channel, Message, User, BotConfig } from '@/types';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { ChatView } from '@/components/chat/chat-view';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeft, Bot, LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Hash } from 'lucide-react'; 
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES } from '@/lib/shapes';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';
import { CreateBotDialog } from '@/components/bot/create-bot-dialog';
import { ShapeTalkLogo } from '@/components/icons/logo';

const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; // For the default bot using env vars
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; // User ID for the default bot

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userBots, setUserBots] = useState<BotConfig[]>([]); 
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [hasSentInitialBotMessageForChannel, setHasSentInitialBotMessageForChannel] = useState<Record<string, boolean>>({});
  const [isCreateBotDialogOpen, setIsCreateBotDialogOpen] = useState(false);


  const { toast } = useToast();

  const sendBotMessageUtil = useCallback((channelId: string, botUserId: string, text: string, type: 'text' | 'ai_response' = 'text', prompt?: string, sourceShapeId?: string) => {
    const botMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: botUserId,
      content: type === 'ai_response' ? { type, textResponse: text, prompt, sourceShapeId } : { type, text },
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, botMessage]);
  }, []);


  useEffect(() => {
    const initializeApp = async () => {
      // Setup default bot user - this can happen before login
      const defaultBotUser: User = { 
        id: DEFAULT_AI_BOT_USER_ID, 
        name: 'Shape AI (Default)', 
        avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
        dataAiHint: 'bot avatar',
        isBot: true,
      };
      setUsers(prevUsers => {
        if (!prevUsers.find(u => u.id === defaultBotUser.id)) {
          return [...prevUsers, defaultBotUser];
        }
        return prevUsers;
      });

      // Setup default channels - can happen before login
      const fetchedChannels: Channel[] = [
        { id: 'general', name: 'general', type: 'channel', icon: Hash },
        { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'channel', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID },
      ];
      setChannels(fetchedChannels);
      // Do not set active channel here, wait for login or user interaction

      // Check API health
      const healthStatus = await checkShapesApiHealth();
      setIsApiHealthy(healthStatus.healthy);

      if (!healthStatus.healthy) {
        toast({
          title: "Shapes API Issue (Default Bot)",
          description: healthStatus.error || "The default Shapes AI bot is currently unavailable. Functionality may be limited.",
          variant: "destructive",
          duration: 10000,
        });
      }
    };

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); 

  const handleLogin = useCallback(() => {
    const fetchedUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2,9)}`, 
      name: 'Demo User',
      avatarUrl: 'https://picsum.photos/seed/demouser/40/40',
      dataAiHint: 'profile user',
    };
    setCurrentUser(fetchedUser);
    setUsers(prevUsers => {
      if (!prevUsers.find(u => u.id === fetchedUser.id)) {
        return [...prevUsers, fetchedUser];
      }
      return prevUsers;
    });

    // Set active channel after login if none is set
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
    toast({ title: "Logged In", description: "Welcome, Demo User!"});
  }, [activeChannelId, channels]);


  useEffect(() => {
    // Initial message for the default bot channel, only if user is logged in
    if (currentUser && isApiHealthy && activeChannelId === DEFAULT_BOT_CHANNEL_ID && !hasSentInitialBotMessageForChannel[DEFAULT_BOT_CHANNEL_ID]) {
      const botMessagesInChannel = messages.filter(msg => msg.channelId === DEFAULT_BOT_CHANNEL_ID && msg.userId === DEFAULT_AI_BOT_USER_ID);
      if (botMessagesInChannel.length === 0) { 
        sendBotMessageUtil(DEFAULT_BOT_CHANNEL_ID, DEFAULT_AI_BOT_USER_ID, "Hello! I'm the default Shape AI, powered by Shapes.inc. How can I help you today?");
        setHasSentInitialBotMessageForChannel(prev => ({ ...prev, [DEFAULT_BOT_CHANNEL_ID]: true }));
      }
    }
  }, [currentUser, isApiHealthy, activeChannelId, sendBotMessageUtil, hasSentInitialBotMessageForChannel, messages]);


  const handleSelectChannel = (channelId: string) => {
    if (!currentUser) {
      toast({title: "Login Required", description: "Please login to select a channel.", variant: "destructive"});
      return;
    }
    setActiveChannelId(channelId);
  };

  const handleSendMessage = async (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to send messages.", variant: "destructive" });
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
    
    if (currentChannel && currentChannel.isBotChannel && content.type === 'text') {
      let botUserIdToUse = DEFAULT_AI_BOT_USER_ID;
      let botApiKeyToUse: string | undefined = undefined;
      let botShapeUsernameToUse: string | undefined = undefined;

      if (currentChannel.botId && currentChannel.botId !== DEFAULT_AI_BOT_USER_ID) {
        const userBotConfig = userBots.find(b => b.id === currentChannel.botId);
        if (userBotConfig) {
          botUserIdToUse = userBotConfig.id;
          botApiKeyToUse = userBotConfig.apiKey;
          botShapeUsernameToUse = userBotConfig.shapeUsername;
        } else {
          sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "Sorry, I couldn't find the configuration for this bot.", "text");
          return;
        }
      } else {
        if (!isApiHealthy) {
          sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "I'm currently unable to connect to my services. Please check the API status or try again later.", "text");
          return;
        }
      }
      
      try {
        const contextShapeForBot = PREDEFINED_SHAPES[0]; 
        if (!contextShapeForBot) {
          console.error("No predefined shapes available for bot context.");
          sendBotMessageUtil(channelId, botUserIdToUse, "I'm having trouble finding a default context. Please try asking about a specific shape.", "text");
          return;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          contextShapeId: contextShapeForBot.id, 
          userId: currentUser.id, 
          channelId: channelId,
          botApiKey: botApiKeyToUse,
          botShapeUsername: botShapeUsernameToUse,   
        });
        
        sendBotMessageUtil(channelId, botUserIdToUse, aiResponse.responseText, "ai_response", content.text, contextShapeForBot.id);

      } catch (error) {
        console.error(`Error getting AI response for ${botShapeUsernameToUse || 'default'} bot:`, error);
        const errorMessage = error instanceof Error ? error.message : "The bot encountered an issue and could not respond.";
        toast({
          title: "AI Bot Error",
          description: errorMessage,
          variant: "destructive",
        });
        sendBotMessageUtil(channelId, botUserIdToUse, `Sorry, I couldn't process that: ${errorMessage}`, "text");
      }
    }
  };
  
  const handleSendAiResponseMessage = async (
    channelId: string, 
    aiData: { textResponse: string; prompt: string; sourceShapeId: string }
  ) => {
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please login to interact with the AI.", variant: "destructive"});
        return;
    }
    if (!channelId) {
      toast({ title: "Channel Error", description: "No active channel selected to send the AI response.", variant: "destructive" });
      return;
    }

    const currentChannel = [...channels, ...directMessages].find(c => c.id === channelId);
    let botUserIdToUse = DEFAULT_AI_BOT_USER_ID;

    if (currentChannel?.isBotChannel && currentChannel.botId) {
        botUserIdToUse = currentChannel.botId;
         if (currentChannel.botId === DEFAULT_AI_BOT_USER_ID && !isApiHealthy) {
             sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "My services are currently unavailable. Please try again later.", "text");
             return;
         }
    }

    sendBotMessageUtil(channelId, botUserIdToUse, aiData.textResponse, "ai_response", aiData.prompt, aiData.sourceShapeId);
  };
  
  const handleOpenSettings = () => {
    if (!currentUser) {
        toast({title: "Login Required", description: "Please login to access settings.", variant: "destructive"});
        return;
    }
    toast({ title: "Settings Clicked", description: "Settings panel would open here." });
  };

  const handleAddChannel = () => {
    if (!currentUser) {
        toast({title: "Login Required", description: "Please login to add a channel.", variant: "destructive"});
        return;
    }
    const newChannelName = prompt("Enter new channel name:");
    if (newChannelName) {
      const newChannel: Channel = {
        id: `channel_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
        name: newChannelName,
        type: 'channel',
        icon: Hash,
      };
      setChannels(prev => [...prev, newChannel]);
      setActiveChannelId(newChannel.id);
      toast({ title: "Channel Added", description: `Channel "${newChannelName}" created.` });
    }
  };

  const handleAddBot = (botConfig: BotConfig) => {
    if (!currentUser) {
        toast({title: "Login Required", description: "Please login to add a bot.", variant: "destructive"});
        return;
    }

    setUserBots(prev => [...prev, botConfig]);

    const botUser: User = {
      id: botConfig.id,
      name: botConfig.name,
      avatarUrl: botConfig.avatarUrl || `https://picsum.photos/seed/${botConfig.id}/40/40`,
      dataAiHint: 'bot avatar',
      isBot: true,
    };
    setUsers(prev => [...prev, botUser]);

    const newDmChannel: Channel = {
      id: `dm_${botConfig.id}_${currentUser.id}`,
      name: botConfig.name, 
      type: 'dm',
      members: [currentUser.id, botConfig.id],
      isBotChannel: true,
      botId: botConfig.id,
      icon: Bot, 
    };
    setDirectMessages(prev => [...prev, newDmChannel]);
    setActiveChannelId(newDmChannel.id); 
    toast({ title: "Bot Added", description: `You can now chat with ${botConfig.name}.` });
  };

  const activeChannelDetails = currentUser ? [...channels, ...directMessages].find(c => c.id === activeChannelId) || null : null;

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <ShapeTalkLogo className="w-24 h-24 text-primary mb-6" />
        <h1 className="text-3xl font-semibold mb-2">Welcome to ShapeTalk</h1>
        <p className="text-muted-foreground mb-8">Chat with AI, discuss shapes, and connect.</p>
        <Button onClick={handleLogin} size="lg">
          <LogIn className="mr-2 h-5 w-5" /> Login as Demo User
        </Button>
         <footer className="absolute bottom-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} ShapeTalk. Shapes.inc integration for demo purposes.
        </footer>
      </div>
    );
  }

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
          onOpenCreateBotDialog={() => setIsCreateBotDialogOpen(true)}
          onLogin={handleLogin} // Pass login handler
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-full max-h-screen relative m-0 rounded-none shadow-none p-0">
          <div className="md:hidden p-2 border-b border-border sticky top-0 bg-background z-20">
             <SidebarTrigger className="h-8 w-8">
                <PanelLeft />
             </SidebarTrigger>
          </div>
          <ChatView
            activeChannel={activeChannelDetails}
            messages={messages.filter(msg => msg.channelId === activeChannelId)} 
            currentUser={currentUser}
            users={users}
            onSendMessage={handleSendMessage}
            onSendAiResponseMessage={handleSendAiResponseMessage}
          />
        </SidebarInset>
      </div>
      {currentUser && (
        <CreateBotDialog
          isOpen={isCreateBotDialogOpen}
          onOpenChange={setIsCreateBotDialogOpen}
          onBotCreated={handleAddBot}
          currentUserId={currentUser.id}
        />
      )}
    </SidebarProvider>
  );
}

