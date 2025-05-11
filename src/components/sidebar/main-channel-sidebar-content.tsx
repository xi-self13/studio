
"use client";

import * as React from "react";
import type { Channel, User, BotGroup, Server, BotConfig, PlatformShape } from '@/types'; 
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
import { Settings, Bot, PlusCircle, Cpu, LogOut, UserCog, Users2 as BotGroupsIcon, Hash, Users as UsersIcon, Globe, ChevronDown, Copy, Share2, RefreshCw, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; // Define if used internally

interface MainChannelSidebarContentProps {
  channels: Channel[]; 
  directMessages: Channel[];
  botGroups: BotGroup[];
  userBots: BotConfig[]; // Added
  platformAis: PlatformShape[]; // Added
  currentUser: User; 
  activeServerId: string | null; 
  activeChannelId: string | null;
  serverName?: string; 
  serverOwnerId?: string; 
  serverInviteCode?: string;
  isServerCommunity?: boolean;
  onSelectChannel: (channelId: string) => void;
  onOpenAccountSettings: () => void;
  onAddChannel: (serverId: string | null) => void; 
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void;
  onOpenManageBotGroupDialog: (groupId: string) => void;
  onLogout: () => void;
  isLoadingUserBots?: boolean;
  isLoadingServers?: boolean; 
  onToggleCommunityStatus?: (serverId: string, currentStatus: boolean) => void;
  onRegenerateInviteCode?: (serverId: string) => void;
  onCopyInviteLink?: (inviteCode: string) => void;
}

export function MainChannelSidebarContent({
  channels,
  directMessages,
  botGroups,
  userBots,
  platformAis,
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

  const { toast } = useToast();

  const usersMap = React.useMemo(() => {
    if (!currentUser) return {};
    
    const tempUsers: Record<string, User | BotConfig | PlatformShape | { uid: string, name: string, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string }> = { 
      [currentUser.uid]: currentUser 
    };

    (userBots || []).forEach(bot => {
      if (!tempUsers[bot.id]) {
        tempUsers[bot.id] = { ...bot, uid: bot.id, isBot: true };
      }
    });

    (platformAis || []).forEach(ai => {
      if (!tempUsers[ai.id]) {
        // Adapt PlatformShape to a common structure, ensuring 'uid' and 'isBot'
        tempUsers[ai.id] = { ...ai, uid: ai.id, isBot: true, name: ai.name || 'AI', avatarUrl: ai.avatarUrl };
      }
    });
    
    // Ensure default bot is in map if it's not already from platformAis
    if (DEFAULT_AI_BOT_USER_ID && !tempUsers[DEFAULT_AI_BOT_USER_ID]) {
        tempUsers[DEFAULT_AI_BOT_USER_ID] = {
            uid: DEFAULT_AI_BOT_USER_ID,
            name: 'Shape AI (Default)',
            avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
            dataAiHint: 'bot avatar',
            isBot: true,
        };
    }

    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
          tempUsers[memberId] = {
            uid: memberId,
            name: dm.name || `User ${memberId.substring(0,6)}`, 
            avatarUrl: null, 
            isBot: false, 
            dataAiHint: 'profile user',
          };
        }
      });
    });

    return tempUsers;
  }, [currentUser, directMessages, userBots, platformAis]);


  const isServerOwner = activeServerId && serverOwnerId === currentUser.uid;

  const handleCopyInvite = () => {
    if (serverInviteCode && onCopyInviteLink) {
      onCopyInviteLink(serverInviteCode);
    } else if (serverInviteCode) { // Fallback if onCopyInviteLink is not provided
        navigator.clipboard.writeText(`${window.location.origin}/?inviteCode=${serverInviteCode}`)
            .then(() => toast({ title: "Invite Link Copied!", description: "Link copied to clipboard." }))
            .catch(() => toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" }));
    }
  };

  return (
    <>
      <SidebarHeader className="p-4 items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            {activeServerId ? (
                <Avatar className="h-8 w-8 group-data-[collapsible=icon]:hidden">
                    <AvatarImage src={userBots.find(s => s.id === activeServerId)?.avatarUrl || `https://picsum.photos/seed/${activeServerId}/40/40`} data-ai-hint="server icon" />
                    <AvatarFallback>{serverName?.substring(0,1) || 'S'}</AvatarFallback>
                </Avatar>
            ) : (
                <ShapeTalkLogo className="w-8 h-8 text-primary group-data-[collapsible=icon]:hidden" />
            )}
            <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden truncate">
              {serverName}
            </h1>
          </div>
          {activeServerId && (isServerOwner || serverInviteCode) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 group-data-[collapsible=icon]:hidden">
                  <ChevronDown size={18}/>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-popover border-popover-border" side="bottom" align="end">
                <div className="space-y-2">
                  {isServerOwner && onToggleCommunityStatus && (
                    <div className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <Label htmlFor="community-switch" className="text-sm">Community Server</Label>
                      <Switch 
                        id="community-switch" 
                        checked={isServerCommunity} 
                        onCheckedChange={(checked) => onToggleCommunityStatus(activeServerId, checked)}
                      />
                    </div>
                  )}
                  {serverInviteCode && (
                    <div className="p-2 space-y-1">
                       <Label className="text-xs text-muted-foreground">Invite Code</Label>
                       <div className="flex items-center gap-1">
                        <Input readOnly value={serverInviteCode} className="h-8 text-xs bg-input flex-1" />
                        <Button variant="ghost" size="icon" onClick={handleCopyInvite} className="h-8 w-8">
                            <Copy size={14}/>
                        </Button>
                        {isServerOwner && onRegenerateInviteCode && (
                           <Button variant="ghost" size="icon" onClick={() => onRegenerateInviteCode(activeServerId)} className="h-8 w-8">
                                <RefreshCw size={14}/>
                           </Button>
                        )}
                       </div>
                    </div>
                  )}
                   {isServerOwner && (
                     <Button variant="outline" size="sm" className="w-full" onClick={() => toast({title: "Server Settings", description:"Full server settings management coming soon."})}>
                        <Settings size={14} className="mr-2"/> Server Settings
                     </Button>
                   )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="h-full">
          
          {/* Server-specific or Global Channels */}
          {(channels.length > 0 || activeServerId) && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                    {activeServerId ? <Hash size={16}/> : <Globe size={16} />} 
                    {activeServerId ? "Channels" : "Global"}
                </span>
                {activeServerId && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={() => onAddChannel(activeServerId)} aria-label="Add New Channel">
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
                 {!isLoadingServers && channels.length === 0 && activeServerId && (
                    <SidebarMenuItem>
                        <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No channels yet.</span>
                    </SidebarMenuItem>
                )}
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
                
                let avatarUrlToUse: string | undefined | null = null;
                let fallbackNameToUse = dm.name ? dm.name.substring(0, 1).toUpperCase() : 'D';
                let dataAiHintToUse = 'profile user';
                let isBotDm = dm.isBotChannel;

                if (otherUser) {
                    isBotDm = !!(otherUser as any).isBot; // isBot can be on User, BotConfig, or adapted PlatformShape
                    avatarUrlToUse = (otherUser as any).avatarUrl;
                    fallbackNameToUse = otherUser.name ? otherUser.name.substring(0, 1).toUpperCase() : (isBotDm ? 'B' : 'U');
                    dataAiHintToUse = (otherUser as any).dataAiHint || (isBotDm ? "bot avatar" : "profile user");
                    
                    if (isBotDm && !avatarUrlToUse && otherUser.uid) {
                        avatarUrlToUse = `https://picsum.photos/seed/${otherUser.uid}/40/40`;
                    }
                } else if (dm.isBotChannel && dm.botId) { 
                    isBotDm = true;
                    avatarUrlToUse = `https://picsum.photos/seed/${dm.botId}/40/40`;
                    dataAiHintToUse = "bot avatar";
                    fallbackNameToUse = dm.name ? dm.name.substring(0,1).toUpperCase() : 'B';
                }
                
                return (
                  <SidebarMenuItem key={dm.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectChannel(dm.id)}
                      isActive={activeChannelId === dm.id}
                      tooltip={dm.name || 'DM'}
                      className="justify-start"
                    >
                      {isBotDm ? <Bot className="h-5 w-5" /> : (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={avatarUrlToUse || undefined} data-ai-hint={dataAiHintToUse} />
                          <AvatarFallback>{fallbackNameToUse}</AvatarFallback>
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
              {!isLoadingUserBots && (botGroups || []).map((group) => (
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
              {!isLoadingUserBots && (!botGroups || botGroups.length === 0) && (
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
MainChannelSidebarContent.displayName = "AppSidebar";
