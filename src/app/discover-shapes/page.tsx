
// src/app/discover-shapes/page.tsx
import type { Metadata } from 'next';
import { getPlatformShapesFromFirestore } from '@/lib/firestoreService';
import type { PlatformShape } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Discover Shapes - ShapeTalk',
  description: 'Browse available AI Shapes on the platform.',
};

// export const revalidate = 60; // Revalidate data every 60 seconds, if desired

async function DiscoverShapesPage() {
  const shapes: PlatformShape[] = await getPlatformShapesFromFirestore();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Discover AI Shapes</h1>
        <p className="text-lg text-muted-foreground">
          Explore the AI models available on the ShapeTalk platform.
        </p>
      </header>

      {shapes.length === 0 && (
        <div className="text-center py-10">
          <Bot className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Shapes Found</h2>
          <p className="text-muted-foreground">
            It looks like there are no AI Shapes configured on the platform yet.
            <br />
            Please check back later or contact an administrator.
          </p>
        </div>
      )}

      {shapes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shapes.map((shape) => (
            <Card key={shape.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-start gap-4 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={shape.avatarUrl} alt={shape.name} data-ai-hint={shape.dataAiHint || 'AI avatar'} />
                  <AvatarFallback className="text-2xl">
                    <Bot size={32} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{shape.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Model: <code className="text-xs bg-muted px-1 py-0.5 rounded">shapesinc/{shape.shapeUsername}</code>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <p className="text-sm text-foreground leading-relaxed">
                  {shape.description}
                </p>
                {shape.tags && shape.tags.length > 0 && (
                  <div className="mt-3">
                    {shape.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="mr-1 mb-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 border-t">
                {/* Placeholder for actions like "Chat with this AI" or "Add to my bots" if applicable in future */}
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
