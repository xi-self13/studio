
// src/app/discover-servers/page.tsx
import type { Metadata } from 'next';
import { getCommunityServersFromFirestore, addUserToServerViaInvite } from '@/lib/firestoreService';
import type { Server, User } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Server as ServerIcon, Users, ExternalLink, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase'; // For getting current user
import { JoinServerButton } from './join-server-button'; // Client component for joining

export const metadata: Metadata = {
  title: 'Discover Servers - ShapeTalk',
  description: 'Browse publicly available community servers on ShapeTalk.',
};

// export const revalidate = 60; // Optional: Revalidate data every 60 seconds

async function DiscoverServersPage() {
  const communityServers: Server[] = await getCommunityServersFromFirestore();
  // We need current user to determine if they are already a member for the Join button
  // This page is a server component, so we can't directly use onAuthStateChanged here for the initial render.
  // The JoinServerButton will be a client component to handle auth state.

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Discover Servers</h1>
        <p className="text-lg text-muted-foreground">
          Explore and join community servers on ShapeTalk.
        </p>
      </header>

      {communityServers.length === 0 && (
        <div className="text-center py-10">
          <ServerIcon className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Community Servers Found</h2>
          <p className="text-muted-foreground">
            It looks like there are no public community servers available yet.
            <br />
            Why not create one and make it public?
          </p>
        </div>
      )}

      {communityServers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communityServers.map((server) => (
            <Card key={server.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-start gap-4 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={server.avatarUrl} alt={server.name} data-ai-hint={server.dataAiHint || 'server icon community'} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {server.name ? server.name.substring(0,1).toUpperCase() : <ServerIcon size={32}/>}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{server.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Owner: <span className="font-medium">{server.ownerUserId.substring(0,8)}...</span> {/* Consider fetching owner display name if public */}
                  </CardDescription>
                   <Badge variant="secondary" className="mt-1 text-xs">Community Server</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {/* Server description could be added to Server type if needed */}
                  Join this server to chat with other members. Invite code: <code className="text-xs bg-muted px-1 py-0.5 rounded">{server.inviteCode}</code>
                </p>
                <div className="mt-2 text-sm text-muted-foreground flex items-center">
                  <Users size={16} className="mr-2"/> {server.memberUserIds?.length || 0} Members
                </div>
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t flex items-center justify-between">
                <JoinServerButton serverId={server.id} inviteCode={server.inviteCode!} />
                {server.inviteCode && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/?inviteCode=${server.inviteCode}`}>
                            Use Invite Link <ExternalLink size={14} className="ml-2"/>
                        </Link>
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <div className="mt-12 text-center">
        <Link href="/" passHref>
          <Button variant="link">Back to Chat</Button>
        </Link>
      </div>
    </div>
  );
}

export default DiscoverServersPage;

