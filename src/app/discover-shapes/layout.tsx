
// src/app/discover-shapes/layout.tsx
"use client"; 

// This layout is minimal because the main sidebar and global structure are handled by the root layout
// and the page.tsx in the main app.
// If /discover-shapes needed its own specific sidebar or header distinct from the main chat app,
// this layout would be more complex. For now, it just renders children.

import { SidebarProvider } from '@/components/ui/sidebar'; // if sidebar context is needed
import { AppSidebar } from '@/components/sidebar/sidebar-content'; // if we want to reuse main sidebar
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, Channel } from '@/types'; // Adjust imports as needed
import { useRouter } from 'next/navigation'; // For redirecting if not logged in

// Dummy props for AppSidebar if it were to be used here directly
// In a real scenario, these would come from a shared context or be fetched.
const dummyChannels: Channel[] = [];
const dummyDirectMessages: Channel[] = [];

export default function DiscoverShapesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email,
          avatarUrl: firebaseUser.photoURL,
          email: firebaseUser.email,
          isBot: false,
        });
      } else {
        setCurrentUser(null);
        // Optionally redirect to login if this page requires authentication
        // router.push('/'); 
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Loading user...</p>
      </div>
    );
  }
  
  // If this page requires login, uncomment this block
  /*
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Please <Link href="/" className="text-primary hover:underline">login</Link> to view this page.</p>
      </div>
    );
  }
  */

  return (
    <SidebarProvider defaultOpen={true}> {/* Assuming sidebar context might be used by children or for consistency */}
      <div className="flex h-screen max-h-screen overflow-hidden bg-background">
        {/* 
          Optionally, render the main AppSidebar here if /discover-shapes should also have it.
          This depends on the desired app structure. If /discover-shapes is meant to be
          "outside" the main chat interface but still part of the same app shell, include it.
          If it's a more distinct section, this layout might be simpler or have its own nav.
        */}
        {currentUser && ( // Only show sidebar if user is logged in, adjust as needed
            <AppSidebar
                channels={dummyChannels} // Pass actual or relevant data if sidebar is used
                directMessages={dummyDirectMessages}
                currentUser={currentUser}
                activeChannelId={null} // No active chat channel on this page
                onSelectChannel={() => {}}
                onOpenSettings={() => {}}
                onAddChannel={() => {}}
                onOpenCreateBotDialog={() => {}}
                onLogout={() => auth.signOut()}
                isLoadingUserBots={false}
            />
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
