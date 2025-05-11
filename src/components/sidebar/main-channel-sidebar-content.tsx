
"use client";

import * as React from "react";
import type { Channel, User, BotGroup } from '@/types'; // Server type removed
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, Bot, PlusCircle, Cpu, LogOut, UserCog, Users2 as BotGroupsIcon, Hash, Users as UsersIcon } from 'lucide-react'; // Removed server specific icons like Globe, EyeOff, Copy, RefreshCw, Share2, ChevronDown
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
// Popover and related input/label/switch for server settings REMOVED

interface MainChannelSidebarContentProps {
  channels: Channel[]; // These are now only global, non-DM, non-group channels like AI Lounge
  directMessages: Channel[];
  botGroups: BotGroup[];
  currentUser: User; 
  activeServerId: string | null; // Will always be null
  activeChannelId: string | null;
  serverName?: string; // Kept for consistency, but will be static "ShapeTalk"
  // serverOwnerId, serverInviteCode, isServerCommunity REMOVED
  onSelectChannel: (channelId: string) => void;
  onOpenAccountSettings: () => void;
  onAddChannel: () => void; // Parameter serverId removed, will show toast "Not Applicable"
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void;
  onOpenManageBotGroupDialog: (groupId: string) => void;
  onLogout: () => void;
  isLoadingUserBots?: boolean;
  isLoadingServers?: boolean; // Will be false
  // onToggleCommunityStatus, onRegenerateInviteCode, onCopyInviteLink REMOVED
}

export function MainChannelSidebarContent({
  channels,
  directMessages,
  botGroups,
  currentUser,
  // activeServerId, // Prop kept for structure but effectively null
  activeChannelId,
  serverName = "ShapeTalk", // Default static name
  // serverOwnerId, // REMOVED
  // serverInviteCode, // REMOVED
  // isServerCommunity, // REMOVED
  onSelectChannel,
  onOpenAccountSettings,
  onAddChannel,
  onOpenCreateBotDialog,
  onOpenCreateBotGroupDialog,
  onOpenManageBotGroupDialog,
  onLogout,
  isLoadingUserBots = false,
  isLoadingServers = false, 
  // onToggleCommunityStatus, // REMOVED
  // onRegenerateInviteCode, // REMOVED
  // onCopyInviteLink, // REMOVED
}: MainChannelSidebarContentProps) {

  const usersMap = React.useMemo(() => {
    const tempUsers: Record<string, User | { name: string, avatarUrl?: string, isBot?: boolean }> = { [currentUser.uid]: currentUser };
    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
          const dmBot = dm.isBotChannel && dm.botId === memberId;
          tempUsers[memberId] = {
            name: dm.name || 'User',
            avatarUrl: dm.isBotChannel ? (usersMap[dm.botId!] as BotConfig)?.avatarUrl || `https://picsum.photos/seed/${dm.botId}/40/40` : (usersMap[memberId] as User)?.avatarUrl,
            isBot: dmBot,
          };
        }
      });
    });
    return tempUsers;
  }, [currentUser, directMessages]);

  // const isServerOwner = activeServerId && serverOwnerId === currentUser.uid; // REMOVED

  return (
    <>
      <SidebarHeader className="p-4 items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <ShapeTalkLogo className="w-8 h-8 text-primary group-data-[collapsible=icon]:hidden" />
            <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {serverName} {/* Will display "ShapeTalk" or custom static name */}
            </h1>
          </div>
          {/* Server settings popover REMOVED */}
        </div>
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="h-full">
          {/* Server-specific channels section REMOVED / Simplified */}
          {/* The logic below implicitly handles showing only global channels as activeServerId will be null */}
          
          {/* Global Channels like AI Lounge */}
          {channels.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Cpu size={16} /> Global</span>
                {/* Add channel button removed as it was server-specific */}
              </SidebarGroupLabel>
              <SidebarMenu>
                {isLoadingServers && [1,2].map(i => <SidebarMenuItem key={`skel-chan-${i}`}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
                {!isLoadingServers && channels.map((channel) => (
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
              </SidebarMenu>
            </SidebarGroup>
          )}


          {/* Direct Messages Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><UsersIcon size={16} /> Direct Messages</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {isLoadingUserBots && [1,2].map(i => <SidebarMenuItem key={`skel-dm-${i}`}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
              {!isLoadingUserBots && directMessages.map((dm) => {
                const otherUserId = dm.members?.find(id => id !== currentUser?.uid);
                const otherUser = otherUserId ? usersMap[otherUserId] : null;
                const avatarUrl = dm.isBotChannel ? ( (otherUser as BotConfig)?.avatarUrl || `https://picsum.photos/seed/${dm.botId}/40/40` ) : (otherUser as User)?.avatarUrl;
                const fallbackName = dm.name ? dm.name.substring(0, 1).toUpperCase() : 'D';
                
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
              {!isLoadingUserBots && directMessages.length === 0 && (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No DMs yet.</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {/* My Bots Section */}
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

          {/* My Bot Groups Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><BotGroupsIcon size={16} /> My Bot Groups</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={onOpenCreateBotGroupDialog} aria-label="Create New Bot Group">
                <PlusCircle size={16} />
              </Button>
            </SidebarGroupLabel>
            <SidebarMenu>
              {isLoadingUserBots && <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>}
              {!isLoadingUserBots && botGroups.map((group) => (
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
              {!isLoadingUserBots && botGroups.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onOpenCreateBotGroupDialog} tooltip="Create your first Bot Group" className="justify-start group-data-[collapsible=icon]:justify-center text-muted-foreground hover:text-foreground">
                    <BotGroupsIcon />
                    <span className="group-data-[collapsible=icon]:hidden">Create a Group</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
        <div className="flex items-center justify-between p-2 rounded-md group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatarUrl || undefined} data-ai-hint={currentUser.dataAiHint || "user avatar"} />
              <AvatarFallback>{currentUser.name ? currentUser.name.substring(0, 1).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[100px]">{currentUser.name}</span>
          </div>
          <Avatar className="h-8 w-8 hidden group-data-[collapsible=icon]:flex">
              <AvatarImage src={currentUser.avatarUrl || undefined} data-ai-hint={currentUser.dataAiHint || "user avatar"} />
              <AvatarFallback>{currentUser.name ? currentUser.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
          </Avatar>

          <div className="flex gap-1 group-data-[collapsible=icon]:flex-col">
            <Button variant="ghost" size="icon" onClick={onOpenAccountSettings} className="group-data-[collapsible=icon]:w-full">
              <UserCog size={18} />
              <span className="sr-only">Account Settings</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="group-data-[collapsible=icon]:w-full">
              <LogOut size={18} />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
