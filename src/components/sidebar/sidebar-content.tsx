
"use client";

import * as React from "react"; 
import type { Channel, User, BotGroup, Server } from '@/types'; 
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  // SidebarTrigger, // Not used directly here if collapsible="icon" from parent
  SidebarMenuSkeleton,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, Bot, PlusCircle, Cpu, LogOut, Compass, UserCog, Users2 as BotGroupsIcon, Server as ServerIcon, Hash, Users as UsersIcon } from 'lucide-react'; // Added ServerIcon, Hash, UsersIcon
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';


interface SidebarNavProps {
  servers: Server[]; // New prop for servers
  channels: Channel[];
  directMessages: Channel[];
  botGroups: BotGroup[]; 
  currentUser: User | null;
  activeServerId: string | null; // New prop
  activeChannelId: string | null;
  onSelectServer: (serverId: string) => void; // New prop
  onSelectChannel: (channelId: string) => void;
  onOpenAccountSettings: () => void; 
  onOpenCreateServerDialog: () => void; // New prop
  onAddChannel: (serverId: string) => void; // Modified to take serverId
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void; 
  onOpenManageBotGroupDialog: (groupId: string) => void; 
  onLogout: () => void;
  isLoadingUserBots?: boolean; 
  isLoadingServers?: boolean; // New prop
}

export function AppSidebar({
  servers,
  channels,
  directMessages,
  botGroups,
  currentUser,
  activeServerId,
  activeChannelId,
  onSelectServer,
  onSelectChannel,
  onOpenAccountSettings,
  onOpenCreateServerDialog,
  onAddChannel,
  onOpenCreateBotDialog,
  onOpenCreateBotGroupDialog,
  onOpenManageBotGroupDialog,
  onLogout,
  isLoadingUserBots = false,
  isLoadingServers = false,
}: SidebarNavProps) {

  const usersMap = React.useMemo(() => {
    if (!currentUser) return {};
    const tempUsers: Record<string, User> = {[currentUser.uid]: currentUser};
    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
          // Attempt to find full user details if available, otherwise create a placeholder
          const existingUser = directMessages.flatMap(d => d.members || []) // Get all member IDs
            .map(id => channels.find(c => c.id === id) || directMessages.find(d => d.id === id)) // Not a good way to find user
            .find(u => u && 'uid' in u && u.uid === memberId); // this logic is flawed for finding general users
          
          tempUsers[memberId] = existingUser || { uid: memberId, name: 'User', isBot: dm.isBotChannel && dm.botId === memberId };
        }
      })
    });
    return tempUsers;
  }, [currentUser, directMessages, channels]);

  // Filter channels based on the active server, or show DMs/Groups if no server selected
  const displayedChannels = activeServerId 
    ? channels.filter(c => c.serverId === activeServerId && !c.isBotGroup && !c.isBotChannel && !c.isAiLounge)
    : []; // If no server, don't show general channels initially, or define a default view

  const displayedBotGroups = activeServerId
    ? botGroups.filter(bg => channels.find(c => c.groupId === bg.id && c.serverId === activeServerId)) // This logic might need adjustment if groups can exist outside server context too
    : botGroups; // Show all user's bot groups if no server selected

  const displayedDirectMessages = activeServerId ? [] : directMessages; // DMs are not server-specific in this model

  return (
    <div className="flex h-full">
      {/* Server List Column (Discord-like far left) */}
      {currentUser && (
        <div className="w-16 bg-muted/30 border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar">
          <TooltipProvider>
            {/* Home/DMs Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={!activeServerId ? "secondary" : "ghost"} 
                  size="icon" 
                  className="h-12 w-12 rounded-full"
                  onClick={() => onSelectServer('')} // Empty string or null to signify no server / DMs view
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
                      <AvatarImage src={server.avatarUrl} data-ai-hint={server.dataAiHint || "server icon"} alt={server.name}/>
                      <AvatarFallback>{server.name.substring(0,1).toUpperCase()}</AvatarFallback>
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
                        variant={typeof window !== 'undefined' && window.location.pathname === '/discover-shapes' && !activeServerId ? "secondary" : "ghost"} 
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
      )}

      {/* Main Sidebar Content (Channels, DMs, etc.) */}
      <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border flex-1 w-[var(--sidebar-width)] data-[collapsible=icon]:w-[var(--sidebar-width-icon)]">
        <SidebarHeader className="p-4 items-center">
          <div className="flex items-center gap-2">
            <ShapeTalkLogo className="w-8 h-8 text-primary group-data-[collapsible=icon]:hidden" />
            <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {activeServerId && servers.find(s=>s.id === activeServerId)?.name || "ShapeTalk"}
            </h1>
          </div>
        </SidebarHeader>

        <SidebarContent asChild>
          <ScrollArea className="h-full">
            {/* Conditional rendering based on activeServerId */}
            {activeServerId && currentUser && ( /* Server specific content */
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Hash size={16} /> Channels</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={() => onAddChannel(activeServerId)} aria-label="Add Channel">
                      <PlusCircle size={16} />
                    </Button>
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {displayedChannels.map((channel) => ( 
                      <SidebarMenuItem key={channel.id}>
                        <SidebarMenuButton
                          onClick={() => onSelectChannel(channel.id)}
                          isActive={activeChannelId === channel.id}
                          tooltip={channel.name}
                          className="justify-start"
                        >
                          {channel.icon ? <channel.icon /> : <Hash />}
                          <span>{channel.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {displayedChannels.length === 0 && (
                      <SidebarMenuItem>
                        <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No channels yet.</span>
                        <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:[&:not(:hover)]:hidden hidden">No channels.</span>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroup>
                {/* Placeholder for server-specific bot groups or other sections if needed */}
              </>
            )}

            {!activeServerId && currentUser && ( /* Global/DM content */
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><UsersIcon size={16} /> Direct Messages</span>
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {isLoadingUserBots && (<><SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem></>)}
                    {!isLoadingUserBots && displayedDirectMessages.map((dm) => {
                      const otherUserId = dm.members?.find(id => id !== currentUser?.uid);
                      const otherUser = otherUserId ? usersMap[otherUserId] : null;
                      const avatarUrl = dm.isBotChannel ? (otherUser?.avatarUrl || `https://picsum.photos/seed/${dm.botId}/40/40`) : otherUser?.avatarUrl;
                      const fallbackName = dm.name ? dm.name.substring(0,1).toUpperCase() : 'D';
                      return (
                          <SidebarMenuItem key={dm.id}>
                          <SidebarMenuButton
                              onClick={() => onSelectChannel(dm.id)}
                              isActive={activeChannelId === dm.id}
                              tooltip={dm.name || 'DM'}
                              className="justify-start"
                          >
                              {dm.isBotChannel ? <Bot className="h-5 w-5" /> : (
                              <Avatar className="h-5 w-5">
                                  <AvatarImage src={avatarUrl || undefined} data-ai-hint={dm.isBotChannel ? "bot avatar" : "profile user"} />
                                  <AvatarFallback>{fallbackName}</AvatarFallback>
                              </Avatar>
                              )}
                              <span>{dm.name}</span>
                          </SidebarMenuButton>
                          </SidebarMenuItem>
                      );
                    })}
                    {!isLoadingUserBots && displayedDirectMessages.length === 0 && (
                      <SidebarMenuItem>
                        <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No DMs yet.</span>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Cpu size={16} /> My Bots</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={onOpenCreateBotDialog} aria-label="Add New Bot">
                      <PlusCircle size={16} />
                    </Button>
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={onOpenCreateBotDialog} tooltip="Create a new AI Bot" className="justify-start group-data-[collapsible=icon]:justify-center">
                            <Cpu />
                            <span className="group-data-[collapsible=icon]:hidden">Add New Bot</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><BotGroupsIcon size={16} /> My Bot Groups</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={onOpenCreateBotGroupDialog} aria-label="Create New Bot Group">
                      <PlusCircle size={16} />
                    </Button>
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {(isLoadingUserBots) && (<SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
                    {!isLoadingUserBots && displayedBotGroups && displayedBotGroups.map((group) => (
                      <SidebarMenuItem key={group.id}>
                        <SidebarMenuButton
                          onClick={() => onSelectChannel(`group_${group.id}`)} 
                          isActive={activeChannelId === `group_${group.id}`}
                          tooltip={group.name}
                          className="justify-start"
                        >
                          <BotGroupsIcon /> 
                          <span>{group.name}</span>
                        </SidebarMenuButton>
                        <SidebarMenuAction onClick={() => onOpenManageBotGroupDialog(group.id)} showOnHover>
                            <Settings />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                    {!isLoadingUserBots && displayedBotGroups && displayedBotGroups.length === 0 && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={onOpenCreateBotGroupDialog} tooltip="Create your first Bot Group" className="justify-start group-data-[collapsible=icon]:justify-center text-muted-foreground hover:text-foreground">
                            <BotGroupsIcon />
                            <span className="group-data-[collapsible=icon]:hidden">Create a Group</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroup>
              </>
            )}
             {!currentUser && (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Login to see content.</span>
                </SidebarMenuItem>
             )}


          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
          {currentUser ? (
            <div className="flex items-center justify-between p-2 rounded-md group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatarUrl || undefined} data-ai-hint={currentUser.dataAiHint || "user avatar"} />
                  <AvatarFallback>{currentUser.name ? currentUser.name.substring(0, 1).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[100px]">{currentUser.name}</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 hidden group-data-[collapsible=icon]:flex">
                          <AvatarImage src={currentUser.avatarUrl || undefined} data-ai-hint={currentUser.dataAiHint || "user avatar"} />
                          <AvatarFallback>{currentUser.name ? currentUser.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
                      </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                      <p>{currentUser.name || 'User'}</p>
                       {currentUser.statusMessage && <p className="text-xs text-muted-foreground">{currentUser.statusMessage}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex gap-1 group-data-[collapsible=icon]:flex-col">
                  <Button variant="ghost" size="icon" onClick={onOpenAccountSettings} className="group-data-[collapsible=icon]:w-full">
                      <UserCog size={18}/>
                      <span className="sr-only">Account Settings</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onLogout} className="group-data-[collapsible=icon]:w-full">
                      <LogOut size={18}/>
                      <span className="sr-only">Logout</span>
                  </Button>
              </div>
            </div>
          ) : (
            <div className="p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              Please login to use the app.
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

