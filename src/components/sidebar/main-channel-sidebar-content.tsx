
"use client";

import * as React from "react";
import type { Channel, User, BotGroup, Server } from '@/types';
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
import { Settings, Bot, PlusCircle, Cpu, LogOut, UserCog, Users2 as BotGroupsIcon, Hash, Users as UsersIcon, ChevronDown, Globe, EyeOff, Copy, RefreshCw, Share2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface MainChannelSidebarContentProps {
  channels: Channel[];
  directMessages: Channel[];
  botGroups: BotGroup[];
  currentUser: User; 
  activeServerId: string | null;
  activeChannelId: string | null;
  serverName?: string; 
  serverOwnerId?: string;
  serverInviteCode?: string;
  isServerCommunity?: boolean;
  onSelectChannel: (channelId: string) => void;
  onOpenAccountSettings: () => void;
  onAddChannel: (serverId: string) => void;
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void;
  onOpenManageBotGroupDialog: (groupId: string) => void;
  onLogout: () => void;
  isLoadingUserBots?: boolean;
  isLoadingServers?: boolean;
  onToggleCommunityStatus?: () => void;
  onRegenerateInviteCode?: () => void;
  onCopyInviteLink?: () => void;
}

export function MainChannelSidebarContent({
  channels,
  directMessages,
  botGroups,
  currentUser,
  activeServerId,
  activeChannelId,
  serverName = "ShapeTalk",
  serverOwnerId,
  serverInviteCode,
  isServerCommunity,
  onSelectChannel,
  onOpenAccountSettings,
  onAddChannel,
  onOpenCreateBotDialog,
  onOpenCreateBotGroupDialog,
  onOpenManageBotGroupDialog,
  onLogout,
  isLoadingUserBots = false,
  isLoadingServers = false, 
  onToggleCommunityStatus,
  onRegenerateInviteCode,
  onCopyInviteLink,
}: MainChannelSidebarContentProps) {

  const usersMap = React.useMemo(() => {
    const tempUsers: Record<string, User | { name: string, avatarUrl?: string, isBot?: boolean }> = { [currentUser.uid]: currentUser };
    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
          const dmBot = dm.isBotChannel && dm.botId === memberId;
          tempUsers[memberId] = {
            name: dm.name || 'User',
            avatarUrl: dm.isBotChannel ? `https://picsum.photos/seed/${dm.botId}/40/40` : undefined,
            isBot: dmBot,
          };
        }
      });
    });
    return tempUsers;
  }, [currentUser, directMessages]);

  const isServerOwner = activeServerId && serverOwnerId === currentUser.uid;

  return (
    <>
      <SidebarHeader className="p-4 items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <ShapeTalkLogo className="w-8 h-8 text-primary group-data-[collapsible=icon]:hidden" />
            <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {serverName}
            </h1>
          </div>
          {isServerOwner && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden">
                  <ChevronDown size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-popover border-border text-popover-foreground">
                <div className="space-y-2">
                  <Label className="text-xs font-medium px-2 text-muted-foreground">Server Settings</Label>
                  {serverInviteCode && (
                    <div className="space-y-1 px-2">
                       <Label htmlFor="invite-code" className="text-xs">Invite Code</Label>
                       <div className="flex items-center gap-1">
                          <Input id="invite-code" readOnly value={serverInviteCode} className="h-8 text-xs flex-1 bg-input" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyInviteLink} aria-label="Copy Invite Link"><Copy size={14}/></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerateInviteCode} aria-label="Regenerate Invite Code"><RefreshCw size={14}/></Button>
                       </div>
                    </div>
                  )}
                  {onToggleCommunityStatus && (
                    <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-md cursor-pointer" onClick={onToggleCommunityStatus}>
                      <div className="flex items-center gap-2">
                        {isServerCommunity ? <Globe size={16}/> : <EyeOff size={16}/>}
                        <span className="text-sm">{isServerCommunity ? 'Public Server' : 'Private Server'}</span>
                      </div>
                      <Switch checked={isServerCommunity} id="server-community-switch" aria-label="Toggle server community status"/>
                    </div>
                  )}
                   <Button variant="ghost" className="w-full justify-start text-sm px-2 py-1.5 hover:bg-accent" onClick={onCopyInviteLink}>
                     <Share2 size={16} className="mr-2"/> Share Invite Link
                   </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="h-full">
          {activeServerId && ( 
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Hash size={16} /> Channels</span>
                {isServerOwner && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={() => onAddChannel(activeServerId)} aria-label="Add Channel">
                    <PlusCircle size={16} />
                  </Button>
                )}
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
                {!isLoadingServers && channels.length === 0 && (
                  <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No channels yet.</span>
                    <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:[&:not(:hover)]:hidden hidden">No channels.</span>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroup>
          )}

          {!activeServerId && ( 
            <>
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
            </>
          )}
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

    
