
"use client"; 

import { ServerRail } from '@/components/sidebar/server-rail';
import { MainChannelSidebarContent } from '@/components/sidebar/main-channel-sidebar-content';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User, Channel, BotGroup, Server } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserBotConfigsFromFirestore, getOwnedBotGroupsFromFirestore, getServersForUserFromFirestore } from '@/lib/firestoreService';
import { Bot, Cpu, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global';

// These are static, representing DMs/global channels available even on discover pages' sidebars
const staticGlobalChannelsForDiscoverLayout: Channel[] = [
  { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'dm', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID, members: ['currentUserDynamic', DEFAULT_AI_BOT_USER_ID] },
  { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: Cpu, isAiLounge: true },
];


export default function DiscoverServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userServers, setUserServers] = useState<Server[]>([]); // Servers the user is part of (for server rail)
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]); // DMs for sidebar
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]); // Bot groups for sidebar
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  const [isLoadingServersState, setIsLoadingServersState] = useState(false); // For the server rail
  const router = useRouter();


  const loadUserDMsAndGlobalChannels = useCallback(async (userId: string) => {
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
      
      // Filter static DMs, ensure default bot DM is added if not already in user's bot DMs
      const defaultBotDmExists = botDMs.some(dm => dm.botId === DEFAULT_AI_BOT_USER_ID);
      const globalStaticDMsForSidebar = staticGlobalChannelsForDiscoverLayout
        .filter(c => c.type === 'dm' && (c.botId !== DEFAULT_AI_BOT_USER_ID || !defaultBotDmExists) )
        .map(c => ({...c, members: [userId, c.botId!]}));

      setUserDirectMessages([...botDMs, ...globalStaticDMsForSidebar]);
    } catch (error) {
      console.error("Failed to load DMs for discover servers layout:", error);
      // Fallback to only showing the default static DMs if fetch fails
      setUserDirectMessages(staticGlobalChannelsForDiscoverLayout.filter(c => c.type === 'dm').map(c => ({...c, members: [userId, c.botId!]})));
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
      console.error("Failed to load user bot groups for discover layout:", error);
      setUserBotGroups([]); 
    } finally {
      setIsLoadingBotGroups(false);
    }
  }, []);

  const loadUserServersForLayout = useCallback(async (userId: string) => {
    setIsLoadingServersState(true);
    try {
      const servers = await getServersForUserFromFirestore(userId);
      setUserServers(servers);
    } catch (error) {
      console.error("Failed to load user servers for discover layout:", error);
      setUserServers([]);
    } finally {
      setIsLoadingServersState(false);
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
            };
        } else {
            appUser = { // Should ideally not happen if signup creates user doc
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email || 'User',
                avatarUrl: firebaseUser.photoURL,
                email: firebaseUser.email,
                isBot: false,
            };
        }
        setCurrentUser(appUser);
        await loadUserDMsAndGlobalChannels(firebaseUser.uid);
        await loadUserBotGroups(firebaseUser.uid); 
        await loadUserServersForLayout(firebaseUser.uid);
      } else {
        setCurrentUser(null);
        setUserDirectMessages(staticGlobalChannelsForDiscoverLayout.filter(c => c.type === 'dm').map(c => ({...c, members: ['placeholderGuest', c.botId!]}))); // Show default DMs for guests
        setUserBotGroups([]); 
        setUserServers([]);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMsAndGlobalChannels, loadUserBotGroups, loadUserServersForLayout]);

  if (isLoadingAuth && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mr-4" />
        <p>Loading user session...</p>
      </div>
    );
  }
  
  // Channels for main sidebar (non-server specific, like AI Lounge from static list)
  const globalChannelsForSidebar = staticGlobalChannelsForDiscoverLayout.filter(c => c.type === 'channel');

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
      {currentUser && (
        <ServerRail
            servers={userServers}
            currentUser={currentUser}
            activeServerId={null} // No active server on discover pages themselves
            onSelectServer={() => router.push('/')} // Selecting a server from rail navigates to main chat
            onOpenCreateServerDialog={() => router.push('/')} // Redirect to main page for server creation dialog
            isLoadingServers={isLoadingServersState}
            isDiscoverPage={true} // To highlight discover icon if on this page type
        />
      )}
      {!currentUser && ( 
          <div className="w-16 bg-muted/30 border-r border-sidebar-border shrink-0">
             {/* Placeholder for ServerRail if needed, or adjust layout to not need it for guests */}
          </div>
      )}

      <SidebarProvider defaultOpen={true}>
        {currentUser ? (
            <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
                <MainChannelSidebarContent
                    channels={globalChannelsForSidebar} // Global channels like AI Lounge
                    directMessages={userDirectMessages}
                    botGroups={userBotGroups}
                    currentUser={currentUser}
                    activeServerId={null} // No server context in this sidebar for discover pages
                    activeChannelId={null} // No active channel specific to this layout's sidebar directly
                    serverName="Discover" // Or ShapeTalk
                    onSelectChannel={(channelId) => router.push(`/?channel=${channelId}`)} // Navigate to main chat with DM/Group
                    onOpenAccountSettings={() => router.push('/')} // Consider modal on discover page or redirect
                    onAddChannel={() => {}} // No server-specific channels here
                    onOpenCreateBotDialog={() => router.push('/')} 
                    onOpenCreateBotGroupDialog={() => router.push('/')} 
                    onOpenManageBotGroupDialog={(groupId) => router.push(`/?group=${groupId}`)} 
                    onLogout={async () => {
                      await auth.signOut();
                      router.push('/'); 
                    }}
                    isLoadingUserBots={isLoadingDMs || isLoadingBotGroups}
                    isLoadingServers={false} // Not loading server-specific channels here
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

