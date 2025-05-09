
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
  const [userServers, setUserServers] = useState<Server[]>([]);
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]);
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  const [isLoadingServersState, setIsLoadingServersState] = useState(false);
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

  const loadUserServersForLayout = useCallback(async (userId: string) => {
    setIsLoadingServersState(true);
    try {
      const servers = await getServersForUserFromFirestore(userId);
      setUserServers(servers);
    } catch (error) {
      console.error("Failed to load user servers for discover page:", error);
      setUserServers([]);
    } finally {
      setIsLoadingServersState(false);
    }
  }, []);

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
            loadUserDMs(firebaseUser.uid);
            loadUserBotGroups(firebaseUser.uid); 
            loadUserServersForLayout(firebaseUser.uid);
        });
      } else {
        setCurrentUser(null);
        setUserDirectMessages([]);
        setUserBotGroups([]); 
        setUserServers([]);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMs, loadUserBotGroups, loadUserServersForLayout]);

  if (isLoadingAuth && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mr-4" />
        <p>Loading user session...</p>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
      {currentUser && (
        <ServerRail
            servers={userServers}
            currentUser={currentUser}
            activeServerId={null} // No active server on discover page itself
            onSelectServer={(serverId) => router.push('/')} // Selecting a server navigates to main chat
            onOpenCreateServerDialog={() => router.push('/')} // Redirect to main page for creation
            isLoadingServers={isLoadingServersState}
            isDiscoverPage={true}
        />
      )}
      {!currentUser && ( // Placeholder for server rail if not logged in
          <div className="w-16 bg-muted/30 border-r border-sidebar-border shrink-0"></div>
      )}

      <SidebarProvider defaultOpen={true}>
        {currentUser ? (
            <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
                <MainChannelSidebarContent
                    channels={[]} // Discover page might not have server-specific channels in its main sidebar
                    directMessages={userDirectMessages}
                    botGroups={userBotGroups || []}
                    currentUser={currentUser}
                    activeServerId={null} // No specific server context in discover's main sidebar
                    activeChannelId={activeChannelIdForDiscover} // Manage active DM/Group for discover context if needed
                    serverName="Discover"
                    onSelectChannel={(channelId) => {
                        // Handle DM selection or navigate back to main chat
                        // For simplicity, DMs here could navigate back to main chat with that DM active
                        setActiveChannelIdForDiscover(channelId); // Or manage local state
                        router.push(`/?channel=${channelId}`); // Example: navigate to main chat with DM
                    }}
                    onOpenAccountSettings={() => router.push('/')}
                    onAddChannel={() => router.push('/')} 
                    onOpenCreateBotDialog={() => router.push('/')} 
                    onOpenCreateBotGroupDialog={() => router.push('/')} 
                    onOpenManageBotGroupDialog={(groupId) => router.push('/')} 
                    onLogout={async () => {
                      await auth.signOut();
                      router.push('/'); 
                    }}
                    isLoadingUserBots={isLoadingDMs || isLoadingBotGroups}
                />
            </Sidebar>
        ) : (
            <div className="w-0 md:w-64 bg-sidebar-background border-r border-sidebar-border p-4 text-center text-sidebar-foreground shrink-0">
                <p className="text-sm">Please <Link href="/" className="text-primary hover:underline">login</Link> to see navigation options.</p>
            </div>
        )}
        
        {/* Main content area for the discover page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
