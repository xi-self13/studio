
"use client";

import * as React from "react";
import type { User, Server } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Compass, Server as ServerIconLucide } from 'lucide-react'; // Added ServerIconLucide for clarity
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ShapeTalkLogo } from '@/components/icons/logo';
import Link from 'next/link';

interface ServerRailProps {
  servers: Server[];
  currentUser: User | null; 
  activeServerId: string | null;
  onSelectServer: (serverId: string | null) => void; 
  onOpenCreateServerDialog: () => void;
  isLoadingServers?: boolean;
  isDiscoverPage?: boolean; 
}

export function ServerRail({
  servers,
  currentUser,
  activeServerId,
  onSelectServer,
  onOpenCreateServerDialog,
  isLoadingServers = false,
  isDiscoverPage = false, // This prop might be re-evaluated based on new discover pages
}: ServerRailProps) {
  if (!currentUser) {
    return <div className="w-16 bg-muted/30 border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0"></div>;
  }

  // Determine if the current page is any discover page for styling the Compass icon
  const onAnyDiscoverPage = typeof window !== 'undefined' && (window.location.pathname === '/discover-shapes' || window.location.pathname === '/discover-servers');


  return (
    <div className="w-16 bg-sidebar-background border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={!activeServerId && !onAnyDiscoverPage ? "secondary" : "ghost"}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => onSelectServer(null)} 
              aria-label="Direct Messages & Home"
            >
              <ShapeTalkLogo className="h-7 w-7 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages & Home</TooltipContent>
        </Tooltip>

        {isLoadingServers && (
          <>
            <Skeleton className="h-12 w-12 rounded-full bg-muted" />
            <Skeleton className="h-12 w-12 rounded-full bg-muted" />
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
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                    {server.name ? server.name.substring(0, 1).toUpperCase() : <ServerIconLucide size={20}/>}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{server.name}</TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full border-2 border-dashed border-sidebar-accent hover:border-primary text-sidebar-accent hover:text-primary" onClick={onOpenCreateServerDialog} aria-label="Create Server">
              <PlusCircle />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create Server</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/discover-servers" passHref legacyBehavior>
              <Button
                variant={isDiscoverPage && window.location.pathname === '/discover-servers' && !activeServerId ? "secondary" : "ghost"}
                size="icon"
                className="h-12 w-12 rounded-full text-sidebar-foreground hover:text-primary"
                aria-label="Discover Servers"
              >
                <Compass />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Discover Servers</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

