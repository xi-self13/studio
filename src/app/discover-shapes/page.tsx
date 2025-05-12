// src/app/discover-shapes/page.tsx
import type { Metadata } from 'next';
import { getPlatformShapesFromFirestore, getPublicUserBotsFromFirestore, getAllAppUsers } from '@/lib/firestoreService';
import type { PlatformShape, BotConfig, User, DiscoverableEntity } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getCurrentUserServer } from '@/lib/auth/server';


export const metadata: Metadata = {
  title: 'Discover - ShapeTalk',
  description: 'Browse available AI Shapes, Bots, and Users on the platform.',
};

// export const revalidate = 60; // Revalidate data every 60 seconds

const ownerNameCache = new Map<string, string>();
async function getOwnerDisplayName(ownerUserId: string): Promise<string> {
  if (ownerNameCache.has(ownerUserId)) {
    return ownerNameCache.get(ownerUserId)!;
  }
  try {
    const userDocRef = doc(db, "users", ownerUserId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists() && userSnap.data()?.name) {
      const displayName = userSnap.data()?.name;
      ownerNameCache.set(ownerUserId, displayName);
      return displayName;
    }
  } catch (error) {
    console.warn(`Could not fetch display name for user ${ownerUserId}:`, error);
  }
  const genericName = `User ${ownerUserId.substring(0, 6)}`;
  ownerNameCache.set(ownerUserId, genericName);
  return genericName;
}


async function DiscoverShapesPage() {
  const currentUser = await getCurrentUserServer(); // Fetch current user for filtering
  const platformAis: PlatformShape[] = await getPlatformShapesFromFirestore();
  const publicUserBots: BotConfig[] = await getPublicUserBotsFromFirestore();
  const allUsers: User[] = await getAllAppUsers();

  const discoverableEntities: DiscoverableEntity[] = [];

  // Add Platform AIs
  platformAis.forEach(ai => {
    discoverableEntities.push({
      id: ai.id,
      name: ai.name,
      description: ai.description,
      avatarUrl: ai.avatarUrl,
      dataAiHint: ai.dataAiHint || 'AI avatar',
      entityType: 'platformAI',
      tags: [...(ai.tags || []), 'Platform AI'],
      shapeUsername: ai.shapeUsername,
    });
  });

  // Add Public User Bots
  for (const bot of publicUserBots) {
    // Don't show a user's own bot if they are the one viewing
    // (This behavior can be adjusted if needed)
    // if (currentUser && bot.ownerUserId === currentUser.uid) continue;
    
    discoverableEntities.push({
      id: bot.id,
      name: bot.name,
      description: bot.systemPrompt || 'A user-created AI bot.',
      avatarUrl: bot.avatarUrl,
      dataAiHint: 'bot avatar user',
      entityType: 'bot',
      tags: ['User Bot', 'Public'],
      shapeUsername: bot.shapeUsername,
      ownerDisplayName: await getOwnerDisplayName(bot.ownerUserId),
    });
  }

  // Add Users (excluding the current user)
  allUsers.forEach(user => {
    if (currentUser && user.uid === currentUser.uid) return; // Don't list the current user themselves
    if (user.isBot) return; // Already handled by bot sections

    discoverableEntities.push({
      id: user.uid,
      name: user.name || 'User',
      description: user.statusMessage || 'A member of the community.',
      avatarUrl: user.avatarUrl,
      dataAiHint: user.dataAiHint || 'profile user',
      entityType: 'user',
      tags: ['User'],
      statusMessage: user.statusMessage,
    });
  });

  // Simple sort: users, then bots, then platform AIs, then by name
  discoverableEntities.sort((a, b) => {
    const typeOrder = { user: 0, bot: 1, platformAI: 2 };
    if (typeOrder[a.entityType] !== typeOrder[b.entityType]) {
      return typeOrder[a.entityType] - typeOrder[b.entityType];
    }
    return a.name.localeCompare(b.name);
  });


  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Discover</h1>
        <p className="text-lg text-muted-foreground">
          Explore AI assistants and connect with other users.
        </p>
      </header>

      {discoverableEntities.length === 0 && (
        <div className="text-center py-10">
          <Users className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">Nothing to Discover Yet</h2>
          <p className="text-muted-foreground">
            It looks like there are no public AIs or other users to show right now.
            <br />
            Check back later or invite some friends!
          </p>
        </div>
      )}

      {discoverableEntities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discoverableEntities.map((entity) => (
            <Card key={entity.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
              <CardHeader className="flex flex-row items-start gap-4 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={entity.avatarUrl || undefined} alt={entity.name} data-ai-hint={entity.dataAiHint || (entity.entityType === 'user' ? 'profile user' : 'AI avatar')} />
                  <AvatarFallback className="text-2xl">
                    {entity.entityType === 'user' ? <Users size={32} /> : <Bot size={32} />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{entity.name}</CardTitle>
                  {entity.entityType !== 'user' && entity.shapeUsername && (
                     <CardDescription className="text-sm text-muted-foreground">
                        Model: <code className="text-xs bg-muted px-1 py-0.5 rounded">shapesinc/{entity.shapeUsername}</code>
                     </CardDescription>
                  )}
                   {entity.entityType === 'bot' && entity.ownerDisplayName && (
                      <span className="block mt-0.5 text-xs text-muted-foreground">By: {entity.ownerDisplayName}</span>
                    )}
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                  {entity.description || (entity.entityType === 'user' ? 'No status message.' : 'No description provided.')}
                </p>
                {entity.tags && entity.tags.length > 0 && (
                  <div className="mt-3">
                    {entity.tags.map((tag) => (
                      <Badge key={tag} variant={entity.entityType === 'user' ? "secondary" : "outline"} className="mr-1 mb-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t">
                <Button asChild variant="outline" size="sm" className="w-full" disabled={!currentUser}>
                  <Link 
                    href={
                        !currentUser ? '#' :
                        entity.entityType === 'user' 
                        ? `/?interactWith=${entity.id}&type=user` 
                        : `/?interactWith=${entity.id}&type=bot`
                    }
                  >
                    <MessageSquare className="mr-2 h-4 w-4"/>
                    {entity.entityType === 'user' ? 'Send DM' : 'Chat with AI'}
                  </Link>
                </Button>
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

export default DiscoverShapesPage;
