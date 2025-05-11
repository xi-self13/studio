
"use client"; 

// import { ServerRail } from '@/components/sidebar/server-rail'; // REMOVED
import { MainChannelSidebarContent } from '@/components/sidebar/main-channel-sidebar-content';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User, Channel, BotGroup, BotConfig, PlatformShape } from '@/types'; // Server type removed, Added BotConfig, PlatformShape
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserBotConfigsFromFirestore, getOwnedBotGroupsFromFirestore } from '@/lib/firestoreService'; // getServersForUserFromFirestore removed
import { Bot, Cpu, Loader2, Compass } from 'lucide-react'; // Added Compass
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
  // const [userServers, setUserServers] = useState<Server[]>([]); // REMOVED
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]);
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  // const [isLoadingServersState, setIsLoadingServersState] = useState(false); // REMOVED
  const router = useRouter();
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
      const defaultBotDmExists = botDMs.some(dm => dm.botId === DEFAULT_AI_BOT_USER_ID);
      const globalStaticDMs = staticGlobalChannelsForDiscover.filter(c => c.type === 'dm' && c.botId === DEFAULT_AI_BOT_USER_ID && !defaultBotDmExists)
        .map(c => ({...c, members: [userId, DEFAULT_AI_BOT_USER_ID]}));

      setUserDirectMessages([...botDMs, ...globalStaticDMs]);
    } catch (error) {
      console.error("Failed to load user DMs for discover page:", error);
      setUserDirectMessages(staticGlobalChannelsForDiscover.filter(c => c.type === 'dm').map(c => ({...c, members: [userId, c.botId!]})));
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

  // loadUserServersForLayout REMOVED

  useEffect(() => {
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid); 
        getDoc(userDocRef).then(userSnap => {
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
            } else { // Should ideally not happen if signup creates user doc
                appUser = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email || 'User',
                    avatarUrl: firebaseUser.photoURL,
                    email: firebaseUser.email,
                    isBot: false,
                };
            }
            setCurrentUser(appUser);
            loadUserDMs(firebaseUser.uid);
            loadUserBotGroups(firebaseUser.uid); 
            // loadUserServersForLayout(firebaseUser.uid); // REMOVED
        });
      } else {
        setCurrentUser(null);
        setUserDirectMessages(staticGlobalChannelsForDiscover.filter(c => c.type === 'dm').map(c => ({...c, members:['placeholderGuest', c.botId!]})));
        setUserBotGroups([]); 
        // setUserServers([]); // REMOVED
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMs, loadUserBotGroups /*loadUserServersForLayout REMOVED*/]);

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
       {/* Simplified static rail for discover pages */}
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
                            variant={router.pathname === '/discover-shapes' ? "secondary" : "ghost"}
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
                    userBots={[] as BotConfig[]} // Pass empty array as not directly needed for discover sidebar
                    platformAis={[] as PlatformShape[]} // Pass empty array
                    currentUser={currentUser}
                    activeServerId={null} 
                    activeChannelId={activeChannelIdForDiscover} 
                    serverName="Discover"
                    onSelectChannel={(channelId) => {
                        setActiveChannelIdForDiscover(channelId); 
                        router.push(`/?channel=${channelId}`); 
                    }}
                    onOpenAccountSettings={() => router.push('/')} 
                    onAddChannel={() => {}} 
                    onOpenCreateBotDialog={() => router.push('/')} 
                    onOpenCreateBotGroupDialog={() => router.push('/')} 
                    onOpenManageBotGroupDialog={(groupId) => router.push(`/?group=${groupId}`)} 
                    onLogout={async () => {
                      await auth.signOut();
                      router.push('/'); 
                    }}
                    isLoadingUserBots={isLoadingDMs || isLoadingBotGroups}
                    isLoadingServers={false} 
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

