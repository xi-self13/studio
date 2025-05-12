
"use client";

import * as React from "react";
import type { Channel, User, BotGroup, BotConfig, PlatformShape } from '@/types'; 
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
import { Settings, Bot, PlusCircle, Cpu, LogOut, UserCog, Users2 as BotGroupsIcon, Hash, Users as UsersIcon, Globe, ChevronDown, Copy, Share2, RefreshCw, EyeOff, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT'; 

interface MainChannelSidebarContentProps {
  channels: Channel[]; 
  directMessages: Channel[];
  allAppUsers: User[]; // Added: For listing all non-bot users for DMs
  botGroups: BotGroup[];
  userBots: BotConfig[]; 
  platformAis: PlatformShape[]; 
  currentUser: User; 
  activeChannelId: string | null;
  serverName?: string; 
  onSelectChannel: (channelId: string) => void;
  onSelectUserForDm: (user: User) => void; // Added: Handler for user DM selection
  onOpenAccountSettings: () => void;
  onAddChannel: (serverId: string | null) => void; 
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void;
  onOpenManageBotGroupDialog: (groupId: string) => void;
  onLogout: () => void;
  isLoadingUserBots?: boolean;
  isLoadingAllUsers?: boolean; // Added
}

export function MainChannelSidebarContent({
  channels,
  directMessages,
  allAppUsers,
  botGroups,
  userBots,
  platformAis,
  currentUser,
  activeChannelId,
  serverName = "ShapeTalk",
  onSelectChannel,
  onSelectUserForDm,
  onOpenAccountSettings,
  onAddChannel,
  onOpenCreateBotDialog,
  onOpenCreateBotGroupDialog,
  onOpenManageBotGroupDialog,
  onLogout,
  isLoadingUserBots = false,
  isLoadingAllUsers = false,
}: MainChannelSidebarContentProps) {

  const { toast } = useToast();

  const usersMap = React.useMemo(() => {
    if (!currentUser) return {};
    
    const tempUsers: Record<string, User | BotConfig | PlatformShape | { uid: string, name: string, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string, lastSeen?: number | null }> = { 
      [currentUser.uid]: currentUser 
    };

    (userBots || []).forEach(bot => {
      if (!tempUsers[bot.id]) {
        tempUsers[bot.id] = { ...bot, uid: bot.id, isBot: true };
      }
    });

    (platformAis || []).forEach(ai => {
      if (!tempUsers[ai.id]) {
        tempUsers[ai.id] = { ...ai, uid: ai.id, isBot: true, name: ai.name || 'AI', avatarUrl: ai.avatarUrl };
      }
    });
    
    if (DEFAULT_AI_BOT_USER_ID && !tempUsers[DEFAULT_AI_BOT_USER_ID]) {
        tempUsers[DEFAULT_AI_BOT_USER_ID] = {
            uid: DEFAULT_AI_BOT_USER_ID,
            name: 'Shape AI (Default)',
            avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
            dataAiHint: 'bot avatar',
            isBot: true,
        };
    }
    
    // Add allAppUsers to the map if not already present
    (allAppUsers || []).forEach(appUser => {
      if (!tempUsers[appUser.uid]) {
        tempUsers[appUser.uid] = appUser;
      }
    });

    // Ensure DM members are in the map if they aren't bots or current user
    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
           const existingAppUser = allAppUsers.find(u => u.uid === memberId);
           if (existingAppUser) {
             tempUsers[memberId] = existingAppUser;
           } else {
              // Fallback for DM members not in allAppUsers (e.g. if a user was deleted but DM still exists)
              tempUsers[memberId] = {
                uid: memberId,
                name: dm.name || `User ${memberId.substring(0,6)}`, 
                avatarUrl: null, 
                isBot: false, 
                dataAiHint: 'profile user',
              };
           }
        }
      });
    });


    return tempUsers;
  }, [currentUser, directMessages, userBots, platformAis, allAppUsers]);


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
        </div>
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="h-full">
          
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                     <MessageSquare size={16} /> 
                    Global
                </span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {channels.filter(c => c.isAiLounge).map((channel) => (
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

          {/* Direct Messages Section (Bots & User DMs) */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><UsersIcon size={16} /> Direct Messages</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {isLoadingUserBots && [1,2].map(i => <SidebarMenuItem key={`skel-dm-${i}`}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
              {!isLoadingUserBots && directMessages.map((dm) => {
                const otherMemberId = dm.members?.find(id => id !== currentUser?.uid);
                const otherMemberInfo = otherMemberId ? usersMap[otherMemberId] : null;
                
                let avatarUrlToUse: string | undefined | null = null;
                let fallbackNameToUse = dm.name ? dm.name.substring(0, 1).toUpperCase() : 'D';
                let dataAiHintToUse = 'profile user';
                let isBotOrUserDm = dm.isBotChannel || dm.isUserDm;
                let isActuallyBot = dm.isBotChannel;

                if (otherMemberInfo) {
                    isActuallyBot = !!(otherMemberInfo as any).isBot;
                    avatarUrlToUse = (otherMemberInfo as any).avatarUrl;
                    fallbackNameToUse = otherMemberInfo.name ? otherMemberInfo.name.substring(0, 1).toUpperCase() : (isActuallyBot ? 'B' : 'U');
                    dataAiHintToUse = (otherMemberInfo as any).dataAiHint || (isActuallyBot ? "bot avatar" : "profile user");
                    if (isActuallyBot && !avatarUrlToUse && otherMemberInfo.uid) {
                        avatarUrlToUse = `https://picsum.photos/seed/${otherMemberInfo.uid}/40/40`;
                    }
                } else if (dm.isBotChannel && dm.botId) { 
                    isActuallyBot = true;
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
                      {isActuallyBot ? <Bot className="h-5 w-5" /> : (
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

           {/* All App Users Section */}
           <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Globe size={16} /> Users</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {isLoadingAllUsers && [1,2,3].map(i => <SidebarMenuItem key={`skel-user-${i}`}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>)}
              {!isLoadingAllUsers && allAppUsers.filter(u => u.uid !== currentUser?.uid).map((user) => (
                <SidebarMenuItem key={user.uid}>
                  <SidebarMenuButton
                    onClick={() => onSelectUserForDm(user)}
                    tooltip={user.name || 'User'}
                    className="justify-start"
                    // isActive={activeChannelId === `dm_...` } // Complex to determine active DM this way, rely on directMessages active state
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatarUrl || undefined} data-ai-hint={user.dataAiHint || "profile user"} />
                      <AvatarFallback>{user.name ? user.name.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {!isLoadingAllUsers && allAppUsers.filter(u => u.uid !== currentUser?.uid).length === 0 && (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No other users found.</span>
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

