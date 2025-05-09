
// src/app/discover-shapes/layout.tsx
"use client"; 

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase'; // Added db
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Added getDoc and doc
import type { User, Channel, BotGroup, Server } from '@/types'; // Added Server
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserBotConfigsFromFirestore, getOwnedBotGroupsFromFirestore, getServersForUserFromFirestore } from '@/lib/firestoreService'; // Added getServersForUserFromFirestore
import { Bot, Hash, Cpu, Users2 as BotGroupsIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Default global channels (DMs/Groups) - these might not be relevant if discover page has its own minimal sidebar or fixed context
const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global';

// These "static channels" are more like global DMs or utility channels.
// In a server-based model, channels primarily exist within servers.
// Discover page might not show typical server channels but could show global DMs.
const staticGlobalChannels: Channel[] = [
  // { id: 'general', name: 'general', type: 'channel', icon: Hash }, // 'general' is server-specific
  { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'dm', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID, members: ['currentUserDynamic', DEFAULT_AI_BOT_USER_ID] },
  { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: Cpu, isAiLounge: true }, // This could be a channel in a "Community" server
];


export default function DiscoverShapesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userServers, setUserServers] = useState<Server[]>([]); // State for user's servers
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]);
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  const [isLoadingServersState, setIsLoadingServersState] = useState(false); // Renamed to avoid conflict
  const router = useRouter();

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
      // Add default bot DM if not already present from user's own bots
      const defaultBotDmExists = botDMs.some(dm => dm.botId === DEFAULT_AI_BOT_USER_ID);
      const globalStaticDMs = staticGlobalChannels.filter(c => c.type === 'dm' && c.botId === DEFAULT_AI_BOT_USER_ID && !defaultBotDmExists)
        .map(c => ({...c, members: [userId, DEFAULT_AI_BOT_USER_ID]})); // Ensure currentUser is member

      setUserDirectMessages([...botDMs, ...globalStaticDMs]);
    } catch (error) {
      console.error("Failed to load user DMs for discover page:", error);
      setUserDirectMessages(staticGlobalChannels.filter(c => c.type === 'dm').map(c => ({...c, members: [userId, c.botId!]}))); // Fallback to static if error
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

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }
  
  // For discover layout, we might not have an "active server" or "active channel" in the same way as the main chat.
  // The sidebar here might primarily be for navigation back to main chat, user settings, or global DMs.
  // We pass null for activeServerId and activeChannelId to reflect this.
  return (
    <SidebarProvider defaultOpen={true}> {/* Keep sidebar open by default on desktop */}
      <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        {currentUser && (
            <AppSidebar
                servers={userServers}
                channels={[]} // Discover page doesn't have its own server channels; DMs/Groups are separate
                directMessages={userDirectMessages} 
                botGroups={userBotGroups || []} // Ensure botGroups is always an array
                currentUser={currentUser}
                activeServerId={null} // No specific server active context on discover page
                activeChannelId={null} // No specific channel active context initially on discover page
                onSelectServer={(serverId) => router.push('/')} // Selecting a server navigates to main chat view
                onSelectChannel={(channelId) => router.push('/')} // Selecting a channel also navigates to main chat view
                onOpenAccountSettings={() => router.push('/')} // Redirect to main page for account settings
                onOpenCreateServerDialog={() => router.push('/')} // Redirect to main page
                onAddChannel={() => router.push('/')} 
                onOpenCreateBotDialog={() => router.push('/')} 
                onOpenCreateBotGroupDialog={() => router.push('/')} 
                onOpenManageBotGroupDialog={() => router.push('/')} 
                onLogout={async () => {
                  await auth.signOut();
                  router.push('/'); 
                }}
                isLoadingUserBots={isLoadingDMs || isLoadingBotGroups} 
                isLoadingServers={isLoadingServersState}
            />
        )}
        {!currentUser && ( 
            <div className="w-64 bg-sidebar-background border-r border-sidebar-border p-4 text-center text-sidebar-foreground shrink-0"> {/* Ensure this sidebar part doesn't collapse */}
                <p className="text-sm">Please <Link href="/" className="text-primary hover:underline">login</Link> to see navigation options.</p>
            </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

