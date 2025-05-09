
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Channel, Message, User, BotConfig, PlatformShape } from '@/types';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { ChatView } from '@/components/chat/chat-view';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelLeft, Bot, LogIn, LogOut, Mail, KeyRound, UserPlus, Cpu, Shapes } from 'lucide-react'; // Added Cpu, Shapes
import { useToast } from "@/hooks/use-toast";
import { Hash } from 'lucide-react'; 
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES } from '@/lib/shapes';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';
import { CreateBotDialog } from '@/components/bot/create-bot-dialog';
import { AccountSettingsDialog } from '@/components/settings/account-settings-dialog';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { getUserBotConfigsFromFirestore, getPlatformShapesFromFirestore, seedPlatformShapes } from '@/lib/firestoreService'; 

const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global';

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); 
  const [userBots, setUserBots] = useState<BotConfig[]>([]); 
  const [platformAis, setPlatformAis] = useState<PlatformShape[]>([]); // New state for platform AIs
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [hasSentInitialBotMessageForChannel, setHasSentInitialBotMessageForChannel] = useState<Record<string, boolean>>({});
  const [isCreateBotDialogOpen, setIsCreateBotDialogOpen] = useState(false);
  const [isAccountSettingsDialogOpen, setIsAccountSettingsDialogOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingUserBots, setIsLoadingUserBots] = useState(false);
  const [isLoadingPlatformAis, setIsLoadingPlatformAis] = useState(false);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

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

  const loadPlatformAis = useCallback(async () => {
    setIsLoadingPlatformAis(true);
    try {
      const fetchedPlatformAis = await getPlatformShapesFromFirestore();
      // await seedPlatformShapes(); // DEV ONLY: Call seeder if needed
      // const fetchedPlatformAis = await getPlatformShapesFromFirestore(); // Fetch again after seeding

      setPlatformAis(fetchedPlatformAis);

      const platformAiUsers: User[] = fetchedPlatformAis.map(pa => ({
        uid: pa.id,
        name: pa.name,
        avatarUrl: pa.avatarUrl,
        dataAiHint: pa.dataAiHint || 'AI avatar',
        isBot: true,
      }));
      
      setUsers(prevUsers => {
        const existingIds = new Set(prevUsers.map(u => u.uid));
        const newPlatformUsers = platformAiUsers.filter(pu => !existingIds.has(pu.uid));
        return [...prevUsers, ...newPlatformUsers];
      });

    } catch (error) {
      console.error("Failed to load platform AIs:", error);
      toast({ title: "Error Loading Platform AIs", description: "Could not fetch platform AI configurations.", variant: "destructive" });
    } finally {
      setIsLoadingPlatformAis(false);
    }
  }, [toast]);


  useEffect(() => {
    const defaultBotUser: User = { 
      uid: DEFAULT_AI_BOT_USER_ID, 
      name: 'Shape AI (Default)', 
      avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
      dataAiHint: 'bot avatar',
      isBot: true,
    };
    
    setUsers(prevUsers => {
      if (!prevUsers.find(u => u.uid === defaultBotUser.uid)) {
        return [defaultBotUser]; 
      }
      return prevUsers;
    });

    const fetchedChannels: Channel[] = [
      { id: 'general', name: 'general', type: 'channel', icon: Hash },
      { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'channel', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID },
      { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: Cpu, isAiLounge: true },
    ];
    setChannels(fetchedChannels);

    const checkApi = async () => {
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
    checkApi();
    loadPlatformAis(); // Load platform AIs on initial setup
  }, [toast, loadPlatformAis]);

  const loadUserBots = useCallback(async (userId: string) => {
    setIsLoadingUserBots(true);
    try {
      const fetchedBotConfigs = await getUserBotConfigsFromFirestore(userId);
      setUserBots(fetchedBotConfigs);

      const botUsers: User[] = fetchedBotConfigs.map(bc => ({
        uid: bc.id,
        name: bc.name,
        avatarUrl: bc.avatarUrl || `https://picsum.photos/seed/${bc.id}/40/40`,
        dataAiHint: 'bot avatar',
        isBot: true,
      }));

      const botDMs: Channel[] = fetchedBotConfigs.map(bc => ({
        id: `dm_${bc.id}_${userId}`,
        name: bc.name,
        type: 'dm',
        members: [userId, bc.id],
        isBotChannel: true,
        botId: bc.id,
        icon: Bot,
      }));
      
      setUsers(prevUsers => {
        const nonUserBots = prevUsers.filter(u => !u.isBot || u.uid === DEFAULT_AI_BOT_USER_ID || platformAis.some(pa => pa.id === u.uid)); 
        const existingIds = new Set(nonUserBots.map(u => u.uid));
        const newBotUsers = botUsers.filter(bu => !existingIds.has(bu.uid));
        return [...nonUserBots, ...newBotUsers];
      });
      setDirectMessages(prevDms => {
        const existingUserDms = prevDms.filter(dm => !botUsers.find(bu => dm.botId === bu.uid && dm.members?.includes(userId)));
        return [...existingUserDms, ...botDMs];
      });

    } catch (error) {
      console.error("Failed to load user bots:", error);
      toast({ title: "Error Loading Bots", description: "Could not fetch your custom bot configurations.", variant: "destructive" });
    } finally {
      setIsLoadingUserBots(false);
    }
  }, [toast, platformAis]);

  useEffect(() => {
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setIsLoadingAuth(false);
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || 'Anonymous User',
          avatarUrl: firebaseUser.photoURL,
          email: firebaseUser.email,
          isBot: false,
        };
        setCurrentUser(appUser);
        setUsers(prevUsers => {
          const baseUsers = prevUsers.filter(u => u.uid === DEFAULT_AI_BOT_USER_ID || platformAis.some(pa => pa.id === u.uid) || (u.isBot && !userBots.some(ub => ub.id === u.uid))); // Keep default bot, platform AIs, and non-user-bots
          const existingUser = baseUsers.find(u => u.uid === appUser.uid);
          if (existingUser) {
            return baseUsers.map(u => u.uid === appUser.uid ? appUser : u);
          }
          return [...baseUsers, appUser];
        });
        
        loadUserBots(firebaseUser.uid); 

        if (!activeChannelId && channels.length > 0) {
          setActiveChannelId(channels[0].id);
        }
        setAuthError(null);
      } else {
        setCurrentUser(null);
         setUsers(prevUsers => prevUsers.filter(u => u.uid === DEFAULT_AI_BOT_USER_ID || platformAis.some(pa => pa.id === u.uid))); 
        setUserBots([]); 
        setDirectMessages([]); 
        setActiveChannelId(null); 
      }
    });
    return () => unsubscribe();
  }, [activeChannelId, channels, loadUserBots, platformAis]);

  const handleFirebaseAuthError = (error: any, actionType: "Login" | "Sign Up") => {
    console.error(`${actionType} error:`, error);
    let description = `An unknown error occurred during ${actionType.toLowerCase()}.`;
    let title = `${actionType} Failed`;

    switch (error.code) {
      case 'auth/unauthorized-domain':
        description = "This domain is not authorized for Firebase Authentication. Please add it to your Firebase project's 'Authorized domains' list (e.g., localhost).";
        break;
      case 'auth/invalid-api-key':
        description = "Invalid Firebase API Key. Please check your Firebase project configuration and environment variables.";
        break;
      case 'auth/invalid-email':
        description = "The email address is not valid.";
        break;
      case 'auth/user-disabled':
        description = "This user account has been disabled.";
        break;
      case 'auth/user-not-found':
        description = "No user found with this email. Please sign up or check your email.";
        break;
      case 'auth/wrong-password':
        description = "Incorrect password. Please try again.";
        break;
      case 'auth/email-already-in-use':
        description = "This email address is already in use by another account.";
        break;
      case 'auth/weak-password':
        description = "The password is too weak. Please choose a stronger password (at least 6 characters).";
        break;
      case 'auth/operation-not-allowed':
        description = "Email/password accounts are not enabled. Please enable it in the Firebase Console.";
        break;
      default:
        if (error.message) {
          description = error.message;
        }
    }
    setAuthError(description); 
    toast({ title, description, variant: "destructive", duration: 7000 });
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Logged In", description: "Welcome!" });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Login");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailPasswordSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Logged In", description: "Welcome!" });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Login");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailPasswordSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setAuthError("Please enter both email and password to sign up.");
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Signed Up Successfully!", description: "Welcome to ShapeTalk!" });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Sign Up");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setEmail('');
      setPassword('');
      setAuthError(null);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error: any)
 {
      console.error("Logout error:", error);
      let description = "An unknown error occurred during logout.";
      if (error.message) {
        description = error.message;
      }
      toast({ title: "Logout Failed", description, variant: "destructive" });
    }
  };

  useEffect(() => {
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
      userId: currentUser.uid, 
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
          sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "Sorry, I couldn't find the configuration for this bot. It might have been removed.", "text");
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
          userId: currentUser.uid, 
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
    } else if (currentChannel && currentChannel.isAiLounge && content.type === 'text') {
      // Human sent a message in AI Lounge
      if (!isApiHealthy) {
        sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "The Shapes API seems to be down. AI Lounge is temporarily paused.", "text");
        return;
      }
      if (platformAis.length === 0) {
        sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "There are no platform AIs available to chat in the lounge right now.", "text");
        return;
      }

      // Pick a random Platform AI to respond
      const randomPlatformAi = platformAis[Math.floor(Math.random() * platformAis.length)];
      
      try {
        const contextShapeForLounge = PREDEFINED_SHAPES[0]; // Or null/undefined if context not needed
        if (!contextShapeForLounge) {
          console.error("No predefined shapes available for AI lounge context.");
          sendBotMessageUtil(channelId, randomPlatformAi.id, "I'm having trouble finding a default context for the lounge.", "text");
          return;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          contextShapeId: contextShapeForLounge.id,
          userId: currentUser.uid, // The human user initiated this chain
          channelId: channelId,
          botShapeUsername: randomPlatformAi.shapeUsername, // Target this specific platform AI
          // botApiKey: undefined, // Uses global API key
        });

        // The Platform AI (randomPlatformAi.id) sends the message
        sendBotMessageUtil(channelId, randomPlatformAi.id, aiResponse.responseText, "ai_response", content.text, contextShapeForLounge.id);

      } catch (error) {
        console.error(`Error getting AI response for Platform AI ${randomPlatformAi.name} in AI Lounge:`, error);
        const errorMessage = error instanceof Error ? error.message : "An AI in the lounge encountered an issue.";
        toast({
          title: "AI Lounge Error",
          description: errorMessage,
          variant: "destructive",
        });
        // Send error message as the specific AI that failed, or as a generic system message
        sendBotMessageUtil(channelId, randomPlatformAi.id, `Sorry, I ( ${randomPlatformAi.name} ) couldn't process that: ${errorMessage}`, "text");
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
    } else if (currentChannel?.isAiLounge) {
      // If it's an AI response in the AI lounge, it's likely from one of the platform AIs.
      // The original prompt might have come from the user, but the response is from an AI.
      // For simplicity, the AI chat dialog doesn't post directly to AI lounge yet.
      // This function is primarily for the AI Chat Dialog which posts to bot channels.
      // If AI chat dialog could target AI lounge, we'd need to pick an AI to "say" this.
      // For now, let's assume AI Chat Dialog responses go to the current bot, not lounge.
      // So, we use DEFAULT_AI_BOT_USER_ID or the specific botId of the channel.
       if (platformAis.length > 0) {
         botUserIdToUse = platformAis[0].id; // Default to first platform AI if in lounge, needs better logic
       }
    }


    sendBotMessageUtil(channelId, botUserIdToUse, aiData.textResponse, "ai_response", aiData.prompt, aiData.sourceShapeId);
  };
  
  const handleOpenSettings = () => {
    if (!currentUser) {
        toast({title: "Login Required", description: "Please login to access settings.", variant: "destructive"});
        return;
    }
    setIsAccountSettingsDialogOpen(true);
  };

  const handleAccountUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers(prevUsers => prevUsers.map(u => u.uid === updatedUser.uid ? updatedUser : u));
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

  const handleBotCreatedLocally = (botConfig: BotConfig) => {
    if (!currentUser) return; 

    setUserBots(prev => [...prev, botConfig]);

    const botUser: User = {
      uid: botConfig.id, 
      name: botConfig.name,
      avatarUrl: botConfig.avatarUrl || `https://picsum.photos/seed/${botConfig.id}/40/40`,
      dataAiHint: 'bot avatar',
      isBot: true,
    };
    setUsers(prev => { 
        if (!prev.find(u => u.uid === botUser.uid)) {
            return [...prev, botUser];
        }
        return prev;
    });

    const newDmChannel: Channel = {
      id: `dm_${botConfig.id}_${currentUser.uid}`, 
      name: botConfig.name, 
      type: 'dm',
      members: [currentUser.uid, botConfig.id],
      isBotChannel: true,
      botId: botConfig.id,
      icon: Bot, 
    };
    setDirectMessages(prev => [...prev, newDmChannel]);
    setActiveChannelId(newDmChannel.id); 
  };

  const activeChannelDetails = currentUser ? [...channels, ...directMessages].find(c => c.id === activeChannelId) || null : null;

  if ((isLoadingAuth || isLoadingPlatformAis) && !currentUser) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <ShapeTalkLogo className="w-24 h-24 text-primary mb-6 animate-pulse" />
        <p className="text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <ShapeTalkLogo className="w-20 h-20 text-primary mb-4 mx-auto" />
            <h1 className="text-3xl font-semibold mb-1">Welcome to ShapeTalk</h1>
            <p className="text-muted-foreground">Chat with AI, discuss shapes, and connect.</p>
          </div>

          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="mt-1"
              />
            </div>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1" disabled={isLoadingAuth}>
                {isLoadingAuth ? <PanelLeft className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} 
                Sign In with Email
              </Button>
              <Button type="button" variant="outline" onClick={handleEmailPasswordSignUp} className="flex-1" disabled={isLoadingAuth}>
                {isLoadingAuth ? <PanelLeft className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Sign Up with Email
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button onClick={handleGoogleLogin} variant="outline" className="w-full" disabled={isLoadingAuth}>
            {isLoadingAuth ? <PanelLeft className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Sign in with Google
          </Button>
        </div>
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
          onLogout={handleLogout}
          isLoadingUserBots={isLoadingUserBots}
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
        <>
          <CreateBotDialog
            isOpen={isCreateBotDialogOpen}
            onOpenChange={setIsCreateBotDialogOpen}
            onBotCreated={handleBotCreatedLocally}
            currentUserId={currentUser.uid} 
          />
          <AccountSettingsDialog
            isOpen={isAccountSettingsDialogOpen}
            onOpenChange={setIsAccountSettingsDialogOpen}
            currentUser={currentUser}
            onAccountUpdate={handleAccountUpdate}
          />
        </>
      )}
    </SidebarProvider>
  );
}
