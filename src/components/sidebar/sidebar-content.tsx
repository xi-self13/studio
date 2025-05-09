
"use client";

import type { Channel, User } from '@/types';
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
} from '@/components/ui/sidebar';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AtSign, Hash, Settings, Users, Bot, PlusCircle, LogIn, Cpu } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarNavProps {
  channels: Channel[];
  directMessages: Channel[];
  currentUser: User | null;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenSettings: () => void;
  onAddChannel: () => void;
  onOpenCreateBotDialog: () => void;
  onLogin: () => void; 
}

export function AppSidebar({
  channels,
  directMessages,
  currentUser,
  activeChannelId,
  onSelectChannel,
  onOpenSettings,
  onAddChannel,
  onOpenCreateBotDialog,
  onLogin,
}: SidebarNavProps) {

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
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
              <span className="flex items-center gap-2"><Hash size={16} /> Channels</span>
              {currentUser && (
                <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={onAddChannel} aria-label="Add Channel">
                  <PlusCircle size={16} />
                </Button>
              )}
            </SidebarGroupLabel>
            <SidebarMenu>
              {channels.map((channel) => (
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
               {channels.length === 0 && (
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
               {currentUser && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" onClick={() => { /* Placeholder for New DM */}} aria-label="New DM">
                    <PlusCircle size={16} />
                  </Button>
               )}
            </SidebarGroupLabel>
            <SidebarMenu>
              {directMessages.map((dm) => (
                <SidebarMenuItem key={dm.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectChannel(dm.id)}
                    isActive={activeChannelId === dm.id}
                    tooltip={dm.name}
                    className="justify-start"
                    disabled={!currentUser}
                  >
                    {dm.isBotChannel ? <Bot className="h-5 w-5" /> : (
                       <Avatar className="h-5 w-5">
                         <AvatarImage src={`https://picsum.photos/seed/${dm.id}/40/40`} data-ai-hint={dm.isBotChannel ? "bot avatar" : "profile user"} />
                         <AvatarFallback>{dm.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                       </Avatar>
                    )}
                    <span>{dm.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {directMessages.length === 0 && (
                 <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No DMs yet.</span>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:[&:not(:hover)]:hidden hidden">No DMs.</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {currentUser && (
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
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.avatarUrl} data-ai-hint={currentUser.dataAiHint || "user avatar"} />
                <AvatarFallback>{currentUser.name.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-sidebar-foreground">{currentUser.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onOpenSettings} className="group-data-[collapsible=icon]:w-full">
                <Settings size={18}/>
                <span className="sr-only">Settings</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-2 group-data-[collapsible=icon]:p-0">
             <Button variant="outline" className="w-full group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-2" onClick={onLogin}>
                <LogIn size={18}/>
                <span className="group-data-[collapsible=icon]:hidden ml-2">Login</span>
             </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

