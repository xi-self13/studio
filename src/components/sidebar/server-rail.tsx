
"use client";

import * as React from "react";
import type { User, Server } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Compass } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ShapeTalkLogo } from '@/components/icons/logo';
import Link from 'next/link';

interface ServerRailProps {
  servers: Server[];
  currentUser: User | null; // Used to determine if rail should be shown
  activeServerId: string | null;
  onSelectServer: (serverId: string | null) => void; // Allow null for DMs/Home
  onOpenCreateServerDialog: () => void;
  isLoadingServers?: boolean;
  isDiscoverPage?: boolean; // To adjust "Discover" button behavior
}

export function ServerRail({
  servers,
  currentUser,
  activeServerId,
  onSelectServer,
  onOpenCreateServerDialog,
  isLoadingServers = false,
  isDiscoverPage = false,
}: ServerRailProps) {
  if (!currentUser) {
    // Optionally render a placeholder or nothing if user is not logged in
    // For consistency in layout, a placeholder might be better if sidebar is always there
    return <div className="w-16 bg-muted/30 border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0"></div>;
  }

  return (
    <div className="w-16 bg-muted/30 border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={!activeServerId && !isDiscoverPage ? "secondary" : "ghost"}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => onSelectServer(null)} // Null for DMs/Home view
              aria-label="Direct Messages"
            >
              <ShapeTalkLogo className="h-7 w-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>

        {isLoadingServers && (
          <>
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </>
        )}
        {!isLoadingServers && servers.map(server => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeServerId === server.id ? "secondary" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => onSelectServer(server.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={server.avatarUrl} data-ai-hint={server.dataAiHint || "server icon"} alt={server.name} />
                  <AvatarFallback>{server.name ? server.name.substring(0, 1).toUpperCase() : 'S'}</AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{server.name}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full border-2 border-dashed border-sidebar-accent hover:border-primary" onClick={onOpenCreateServerDialog} aria-label="Create Server">
              <PlusCircle className="text-sidebar-accent group-hover:text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create Server</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/discover-shapes" passHref legacyBehavior>
              <Button
                variant={isDiscoverPage && !activeServerId ? "secondary" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-full"
                aria-label="Discover Shapes"
              >
                <Compass />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Discover Shapes</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
