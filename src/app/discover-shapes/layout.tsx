
// src/app/discover-shapes/layout.tsx
"use client"; 

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { User, Channel, BotConfig, BotGroup } from '@/types'; // Added BotGroup
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserBotConfigsFromFirestore, getOwnedBotGroupsFromFirestore } from '@/lib/firestoreService'; // Added getOwnedBotGroupsFromFirestore
import { Bot, Hash, Cpu, Users2 as BotGroupsIcon } from 'lucide-react'; // Added BotGroupsIcon for consistency

// Define static channels similar to page.tsx for consistency
const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global';

const staticChannels: Channel[] = [
  { id: 'general', name: 'general', type: 'channel', icon: Hash },
  { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'channel', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID },
  { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: Cpu, isAiLounge: true },
];


export default function DiscoverShapesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDirectMessages, setUserDirectMessages] = useState<Channel[]>([]);
  const [userBotGroups, setUserBotGroups] = useState<BotGroup[]>([]); // Added state for bot groups
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false); // Added loading state for bot groups
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
      setUserDirectMessages(botDMs);
    } catch (error) {
      console.error("Failed to load user DMs for discover page:", error);
      setUserDirectMessages([]); // Set to empty on error
    } finally {
      setIsLoadingDMs(false);
    }
  }, []);

  const loadUserBotGroups = useCallback(async (userId: string) => { // Added function to load bot groups
    setIsLoadingBotGroups(true);
    try {
      const groups = await getOwnedBotGroupsFromFirestore(userId);
      setUserBotGroups(groups);
    } catch (error) {
      console.error("Failed to load user bot groups for discover page:", error);
      setUserBotGroups([]); // Set to empty on error
    } finally {
      setIsLoadingBotGroups(false);
    }
  }, []);

  useEffect(() => {
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || 'User',
          avatarUrl: firebaseUser.photoURL,
          email: firebaseUser.email,
          isBot: false,
        });
        loadUserDMs(firebaseUser.uid);
        loadUserBotGroups(firebaseUser.uid); // Load bot groups when user is authenticated
      } else {
        setCurrentUser(null);
        setUserDirectMessages([]);
        setUserBotGroups([]); // Clear bot groups on logout
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMs, loadUserBotGroups]);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        {currentUser && (
            <AppSidebar
                channels={staticChannels} 
                directMessages={userDirectMessages} 
                botGroups={userBotGroups} // Pass botGroups
                currentUser={currentUser}
                activeChannelId={null} 
                onSelectChannel={() => router.push('/')} 
                onOpenAccountSettings={() => {/* Might open settings, or be disabled/redirect to main page settings */}}
                onAddChannel={() => {/* Might be disabled or redirect */}}
                onOpenCreateBotDialog={() => {/* Might be disabled or redirect */}}
                onOpenCreateBotGroupDialog={() => {/* Placeholder or redirect to main page */}} 
                onOpenManageBotGroupDialog={(groupId: string) => {/* Placeholder or redirect to main page */}} 
                onLogout={async () => {
                  await auth.signOut();
                  router.push('/'); 
                }}
                isLoadingUserBots={isLoadingDMs || isLoadingBotGroups} 
            />
        )}
        {!currentUser && ( 
            <div className="w-64 bg-sidebar-background border-r border-sidebar-border p-4 text-center text-sidebar-foreground">
                <p className="text-sm">Please <Link href="/" className="text-primary hover:underline">login</Link> to see channels.</p>
            </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
