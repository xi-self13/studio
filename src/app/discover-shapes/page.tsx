
// src/app/discover-shapes/page.tsx
import type { Metadata } from 'next';
import { getPlatformShapesFromFirestore, getPublicUserBotsFromFirestore } from '@/lib/firestoreService';
import type { PlatformShape, BotConfig, User } from '@/types'; // Added User type
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase'; // For fetching user display names
import { doc, getDoc } from 'firebase/firestore';

export const metadata: Metadata = {
  title: 'Discover Shapes - ShapeTalk',
  description: 'Browse available AI Shapes on the platform.',
};

// export const revalidate = 60; // Revalidate data every 60 seconds

// Helper to fetch owner display name (cached locally per request for efficiency)
const ownerNameCache = new Map<string, string>();
async function getOwnerDisplayName(ownerUserId: string): Promise<string> {
  if (ownerNameCache.has(ownerUserId)) {
    return ownerNameCache.get(ownerUserId)!;
  }
  try {
    // Assuming you have a 'users' collection where display names are stored
    // This is a common pattern but adjust if your user data is elsewhere or not public
    const userDocRef = doc(db, "users", ownerUserId); // Adjust "users" if your collection name is different
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
  const platformAis: PlatformShape[] = await getPlatformShapesFromFirestore();
  const publicUserBots: BotConfig[] = await getPublicUserBotsFromFirestore();

  const discoverableAis: PlatformShape[] = [
    ...platformAis,
    ...(await Promise.all(publicUserBots.map(async (bot): Promise<PlatformShape> => ({
      id: bot.id,
      name: bot.name,
      description: bot.systemPrompt || 'A user-created AI bot.', // Use system prompt or a default
      avatarUrl: bot.avatarUrl,
      dataAiHint: 'bot avatar user',
      shapeUsername: bot.shapeUsername,
      tags: ['user-created', bot.isPublic ? 'public' : 'private'], // Add relevant tags
      isUserCreated: true,
      ownerDisplayName: await getOwnerDisplayName(bot.ownerUserId),
    }))))
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Discover AI Shapes</h1>
        <p className="text-lg text-muted-foreground">
          Explore official platform AIs and public community-created bots.
        </p>
      </header>

      {discoverableAis.length === 0 && (
        <div className="text-center py-10">
          <Bot className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Shapes Found</h2>
          <p className="text-muted-foreground">
            It looks like there are no AI Shapes configured on the platform yet, or no community bots are public.
            <br />
            Please check back later or contact an administrator.
          </p>
        </div>
      )}

      {discoverableAis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discoverableAis.map((shape) => (
            <Card key={shape.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-start gap-4 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={shape.avatarUrl} alt={shape.name} data-ai-hint={shape.dataAiHint || (shape.isUserCreated ? 'bot avatar user' : 'AI avatar')} />
                  <AvatarFallback className="text-2xl">
                    {shape.isUserCreated ? <Users size={32} /> : <Bot size={32} />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{shape.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Model: <code className="text-xs bg-muted px-1 py-0.5 rounded">shapesinc/{shape.shapeUsername}</code>
                    {shape.isUserCreated && shape.ownerDisplayName && (
                      <span className="block mt-0.5 text-xs">By: {shape.ownerDisplayName}</span>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                  {shape.description}
                </p>
                {shape.tags && shape.tags.length > 0 && (
                  <div className="mt-3">
                    {shape.tags.map((tag) => (
                      <Badge key={tag} variant={shape.isUserCreated ? "outline" : "secondary"} className="mr-1 mb-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t">
                 {/* For user-created bots, this could link to start a DM. For platform bots, other actions. */}
                <Button variant="outline" size="sm" disabled> 
                  Interact (Coming Soon)
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
