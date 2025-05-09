
// src/app/discover-shapes/layout.tsx
"use client"; 

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/sidebar-content';
import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { User, Channel, BotConfig } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserBotConfigsFromFirestore } from '@/lib/firestoreService';
import { Bot, Hash, Cpu } from 'lucide-react'; // For channel icons

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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
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
      } else {
        setCurrentUser(null);
        setUserDirectMessages([]);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [loadUserDMs]); // Removed router from dependencies as loadUserDMs is stable

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
                currentUser={currentUser}
                activeChannelId={null} 
                onSelectChannel={() => router.push('/')} 
                onOpenSettings={() => {/* Might open settings, or be disabled/redirect */}}
                onAddChannel={() => {/* Might be disabled or redirect */}}
                onOpenCreateBotDialog={() => {/* Might be disabled or redirect */}}
                onLogout={async () => {
                  await auth.signOut();
                  router.push('/'); 
                }}
                isLoadingUserBots={isLoadingDMs} 
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
