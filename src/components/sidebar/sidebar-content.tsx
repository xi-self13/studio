"use client";

import type { Channel, User, BotGroup } from '@/types'; 
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
  SidebarTrigger,
  SidebarMenuSkeleton,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AtSign, Hash, Settings, Users, Bot, PlusCircle, Cpu, LogOut, Compass, UserCog, Users2 as BotGroupsIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';


interface SidebarNavProps {
  channels: Channel[];
  directMessages: Channel[];
  botGroups: BotGroup[]; 
  currentUser: User | null;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenAccountSettings: () => void; 
  onAddChannel: () => void;
  onOpenCreateBotDialog: () => void;
  onOpenCreateBotGroupDialog: () => void; 
  onOpenManageBotGroupDialog: (groupId: string) => void; 
  onLogout: () => void;
  isLoadingUserBots?: boolean; 
}

export function AppSidebar({
  channels,
  directMessages,
  botGroups,
  currentUser,
  activeChannelId,
  onSelectChannel,
  onOpenAccountSettings,
  onAddChannel,
  onOpenCreateBotDialog,
  onOpenCreateBotGroupDialog,
  onOpenManageBotGroupDialog,
  onLogout,
  isLoadingUserBots = false,
}: SidebarNavProps) {

  const usersMap = React.useMemo(() => {
    if (!currentUser) return {};
    // Create a map of users for quick avatar lookup in DMs
    // This is a placeholder; ideally, `users` prop would be passed or fetched
    const tempUsers: Record<string, User> = {[currentUser.uid]: currentUser};
    directMessages.forEach(dm => {
      dm.members?.forEach(memberId => {
        if (!tempUsers[memberId] && memberId !== currentUser.uid) {
          // Placeholder for other users if not available
          tempUsers[memberId] = { uid: memberId, name: 'User', isBot: dm.isBotChannel && dm.botId === memberId };
        }
      })
    });
    return tempUsers;
  }, [currentUser, directMessages]);


  return (
    <Sidebar collapsible="none" variant="sidebar" side="left" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 items-center">
        <div className="flex items-center gap-2">
          <ShapeTalkLogo className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">ShapeTalk</h1>
        </div>
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Compass size={16} /> Discover</span>
            </SidebarGroupLabel>
            <SidebarMenu>
               <SidebarMenuItem>
                <Link href="/discover-shapes" passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    tooltip="Discover AI Shapes"
                    className="justify-start"
                    disabled={!currentUser}
                    isActive={typeof window !== 'undefined' && window.location.pathname === '/discover-shapes'} 
                  >
                    <a>
                      <Compass />
                      <span>Platform Shapes</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>


          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Hash size={16} /> Channels</span>
              {currentUser && (
                <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={onAddChannel} aria-label="Add Channel">
                  <PlusCircle size={16} />
                </Button>
              )}
            </SidebarGroupLabel>
            <SidebarMenu>
              {channels.filter(c => !c.isBotGroup).map((channel) => ( 
                <SidebarMenuItem key={channel.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectChannel(channel.id)}
                    isActive={activeChannelId === channel.id}
                    tooltip={channel.name}
                    className="justify-start"
                    disabled={!currentUser}
                  >
                    {channel.icon ? <channel.icon /> : <Hash />}
                    <span>{channel.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
               {channels.filter(c => !c.isBotGroup).length === 0 && currentUser && (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No channels yet.</span>
                   <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:[&:not(:hover)]:hidden hidden">No channels.</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
               <span className="flex items-center gap-2"><Users size={16} /> Direct Messages</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {isLoadingUserBots && currentUser && (
                <>
                  <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                  <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                </>
              )}
              {!isLoadingUserBots && directMessages.map((dm) => {
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
                        disabled={!currentUser}
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
              {!isLoadingUserBots && directMessages.length === 0 && currentUser && (
                 <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No DMs yet.</span>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:[&:not(:hover)]:hidden hidden">No DMs.</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {currentUser && (
            <>
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
                  {(isLoadingUserBots) && ( 
                    <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
                  )}
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
                   {!isLoadingUserBots && channels.filter(c=>c.isBotGroup).length === 0 && botGroups.length === 0 && (
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
  );
}

