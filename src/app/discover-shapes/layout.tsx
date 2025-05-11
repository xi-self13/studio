"use client"; 

import { MainChannelSidebarContent } from '@/components/sidebar/main-channel-sidebar-content';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User, Channel, BotGroup, BotConfig, PlatformShape } from '@/types';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Added usePathname, useSearchParams
import Link from 'next/link';
import { getUserBotConfigsFromFirestore, getOwnedBotGroupsFromFirestore } from '@/lib/firestoreService';
import { Bot, Cpu, Loader2, Compass } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ShapeTalkLogo } from '@/components/icons/logo';


const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global';

const staticGlobalChannelsForDiscover: Channel[] = [
  { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'dm', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID, members: ['currentUserDynamic', DEFAULT_AI_BOT_USER_ID] },
  { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: Cpu, isAiLounge: true },
];


export default function DiscoverShapesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]);
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // For active state on Compass icon
  const searchParams = useSearchParams(); // For initial channel selection if needed
  const [activeChannelIdForDiscover, setActiveChannelIdForDiscover] = useState<string | null>(null);


  const loadUserDMs = useCallback(async (userId: string) => {
    setIsLoadingDMs(true);
    try {
      const fetchedBotConfigs = await getUserBotConfigsFromFirestore(userId);
      const botDMs: Channel[] = fetchedBotConfigs.map(bc => ({
        id: `dm_${bc.id}_${userId}`,
        name: bc.name,
        type: 'dm',
        members: [userId, bc.id],
        isBotChannel: true,
        botId: bc.id,
        icon: Bot,
      }));
      
      const defaultBotDm = staticGlobalChannelsForDiscover.find(c => c.type === 'dm' && c.botId === DEFAULT_AI_BOT_USER_ID);
      const globalStaticDMs = defaultBotDm ? [{...defaultBotDm, members: [userId, DEFAULT_AI_BOT_USER_ID]}] : [];
      
      // Ensure no duplicates if a user bot has the same ID as the default (unlikely but safe)
      const combinedDMs = [...botDMs];
      if (defaultBotDm && !botDMs.some(dm => dm.botId === DEFAULT_AI_BOT_USER_ID)) {
        combinedDMs.push(...globalStaticDMs);
      }
      setUserDirectMessages(combinedDMs);

    } catch (error) {
      console.error("Failed to load user DMs for discover page:", error);
      const defaultBotDm = staticGlobalChannelsForDiscover.find(c => c.type === 'dm' && c.botId === DEFAULT_AI_BOT_USER_ID);
      setUserDirectMessages(defaultBotDm ? [{...defaultBotDm, members: [userId, defaultBotDm.botId!]}] : []);
    } finally {
      setIsLoadingDMs(false);
    }
  }, []);

  const loadUserBotGroups = useCallback(async (userId: string) => { 
    setIsLoadingBotGroups(true);
    try {
      const groups = await getOwnedBotGroupsFromFirestore(userId);
      setUserBotGroups(groups);
    } catch (error) {
      console.error("Failed to load user bot groups for discover page:", error);
      setUserBotGroups([]); 
    } finally {
      setIsLoadingBotGroups(false);
    }
  }, []);


  useEffect(() => {
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid); 
        const userSnap = await getDoc(userDocRef);
        let appUser: User;
        if (userSnap.exists()) {
            const userData = userSnap.data();
            appUser = {
                uid: firebaseUser.uid,
                name: userData?.name || firebaseUser.displayName || firebaseUser.email || 'User',
                avatarUrl: userData?.avatarUrl || firebaseUser.photoURL,
                email: firebaseUser.email,
                statusMessage: userData?.statusMessage,
                isBot: false,
                shapesIncApiKey: userData?.shapesIncApiKey,
                shapesIncUsername: userData?.shapesIncUsername,
                linkedAccounts: userData?.linkedAccounts || [],
            };
        } else { 
            appUser = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email || 'User',
                avatarUrl: firebaseUser.photoURL,
                email: firebaseUser.email,
                isBot: false,
            };
        }
        setCurrentUser(appUser);
        await loadUserDMs(firebaseUser.uid);
        await loadUserBotGroups(firebaseUser.uid); 
      } else {
        setCurrentUser(null);
        const defaultBotDm = staticGlobalChannelsForDiscover.find(c => c.type === 'dm' && c.botId === DEFAULT_AI_BOT_USER_ID);
        setUserDirectMessages(defaultBotDm ? [{...defaultBotDm, members:['placeholderGuest', defaultBotDm.botId!]}] : []);
        setUserBotGroups([]); 
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMs, loadUserBotGroups]);

  // Effect to set initial active channel based on query params or defaults
  useEffect(() => {
      if (isLoadingAuth || isLoadingDMs || isLoadingBotGroups) return; // Wait for data

      const channelQuery = searchParams.get('channel');
      let newActiveChannelId: string | null = null;
      const allDisplayableChannels = [
          ...staticGlobalChannelsForDiscover.filter(c => c.type === 'channel'),
          ...userDirectMessages,
          ...userBotGroups.map(g => ({ // Transform bot groups to channel-like structure for sidebar
            id: `group_${g.id}`, 
            name: g.name, 
            type: 'group', 
            icon: Cpu, // Placeholder, adjust as needed
            isBotGroup: true, 
            groupId: g.id
        }))
      ];
      
      if (channelQuery && allDisplayableChannels.some(c => c.id === channelQuery)) {
          newActiveChannelId = channelQuery;
      } else if (allDisplayableChannels.length > 0) {
          // Prioritize: Default DM if exists, then AI Lounge, then first DM, then first Group
          const defaultDm = userDirectMessages.find(dm => dm.botId === DEFAULT_AI_BOT_USER_ID);
          const aiLounge = staticGlobalChannelsForDiscover.find(c => c.id === AI_LOUNGE_CHANNEL_ID);
          
          if (defaultDm) newActiveChannelId = defaultDm.id;
          else if (aiLounge) newActiveChannelId = aiLounge.id;
          else if (userDirectMessages.length > 0) newActiveChannelId = userDirectMessages[0].id;
          else if (userBotGroups.length > 0) newActiveChannelId = `group_${userBotGroups[0].id}`;
          else if (staticGlobalChannelsForDiscover.filter(c => c.type === 'channel').length > 0) {
            newActiveChannelId = staticGlobalChannelsForDiscover.filter(c => c.type === 'channel')[0].id;
          }
      }

      if (newActiveChannelId !== activeChannelIdForDiscover) {
        setActiveChannelIdForDiscover(newActiveChannelId);
        // If discover page itself is a chat target, redirect appropriately
        // For now, we assume discover-shapes page is for browsing, not active chat itself.
        // If you want to select a channel and navigate to main chat:
        // if (newActiveChannelId) router.push(`/?channel=${newActiveChannelId}`);
      }

  }, [isLoadingAuth, isLoadingDMs, isLoadingBotGroups, userDirectMessages, userBotGroups, searchParams, activeChannelIdForDiscover, router]);


  if (isLoadingAuth && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mr-4" />
        <p>Loading user session...</p>
      </div>
    );
  }
  
  const globalChannelsForSidebar = staticGlobalChannelsForDiscover.filter(c => c.type === 'channel');


  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        <div className="w-16 bg-sidebar-background border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={"ghost"}
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => router.push('/')} 
                            aria-label="Direct Messages & Home"
                        >
                            <ShapeTalkLogo className="h-7 w-7 text-primary" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Back to Chat</TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={pathname === '/discover-shapes' ? "secondary" : "ghost"}
                            size="icon"
                            className="h-12 w-12 rounded-full text-sidebar-foreground hover:text-primary"
                            aria-label="Discover Shapes"
                            onClick={() => router.push('/discover-shapes')} 
                        >
                            <Compass />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Discover Shapes</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

      <SidebarProvider defaultOpen={true}>
        {currentUser ? (
            <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
                <MainChannelSidebarContent
                    channels={globalChannelsForSidebar} 
                    directMessages={userDirectMessages}
                    botGroups={userBotGroups || []}
                    userBots={[] as BotConfig[]} 
                    platformAis={[] as PlatformShape[]} 
                    currentUser={currentUser}
                    activeServerId={null} // Servers removed
                    activeChannelId={activeChannelIdForDiscover} 
                    serverName="Discover" // Static name for this layout
                    onSelectChannel={(channelId) => {
                        // setActiveChannelIdForDiscover(channelId); // This layout doesn't host active chat view
                        // Instead, clicking a channel here should navigate to the main chat page with that channel
                        router.push(`/?channel=${channelId}`); 
                    }}
                    onOpenAccountSettings={() => router.push('/?settings=account')} // Navigate to main page with query for settings
                    onAddChannel={() => {}} // No channel creation in discover layout
                    onOpenCreateBotDialog={() => router.push('/?createBot=true')} 
                    onOpenCreateBotGroupDialog={() => router.push('/?createGroup=true')} 
                    onOpenManageBotGroupDialog={(groupId) => router.push(`/?manageGroup=${groupId}`)} 
                    onLogout={async () => {
                      await auth.signOut();
                      router.push('/'); 
                    }}
                    isLoadingUserBots={isLoadingDMs || isLoadingBotGroups} // Combined loading state for DMs and Groups
                    isLoadingServers={false} // Servers removed
                />
            </Sidebar>
        ) : (
            <div className="w-0 md:w-64 bg-sidebar-background border-r border-sidebar-border p-4 text-center text-sidebar-foreground shrink-0">
                <p className="text-sm">Please <Link href="/" className="text-primary hover:underline">login</Link> to see navigation options.</p>
            </div>
        )}
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
