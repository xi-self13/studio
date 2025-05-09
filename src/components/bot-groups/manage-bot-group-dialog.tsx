
"use client";

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BotGroup, BotConfig, PlatformShape } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Users2 as BotGroupsIcon, Loader2, Save, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label'; // Added import for Label

const formSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters.').max(50, 'Group name must be 50 characters or less.'),
  description: z.string().max(500, "Description too long (max 500 chars).").optional(),
  avatarUrl: z.string().url("Must be a valid URL for avatar image.").optional().or(z.literal('')),
});

type ManageBotGroupFormValues = z.infer<typeof formSchema>;

interface ManageBotGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  groupConfig: BotGroup | null;
  userBots: BotConfig[]; 
  platformAndPublicAis: PlatformShape[]; 
  onBotGroupUpdated: (updatedGroupData: Omit<BotGroup, 'id' | 'ownerUserId' | 'memberUserIds'> & {id: string}) => Promise<void>;
  onBotGroupDeleted: (groupId: string) => Promise<void>;
  onAddBotToGroup: (groupId: string, botId: string) => Promise<void>;
  onRemoveBotFromGroup: (groupId: string, botId: string) => Promise<void>;
}

export function ManageBotGroupDialog({
  isOpen,
  onOpenChange,
  groupConfig,
  userBots,
  platformAndPublicAis,
  onBotGroupUpdated,
  onBotGroupDeleted,
  onAddBotToGroup,
  onRemoveBotFromGroup,
}: ManageBotGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentBotIds, setCurrentBotIds] = useState<string[]>([]); // Tracks bot IDs for the current group session in dialog
  const { toast } = useToast();

  const form = useForm<ManageBotGroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (groupConfig) {
      form.reset({
        name: groupConfig.name,
        description: groupConfig.description || '',
        avatarUrl: groupConfig.avatarUrl || '',
      });
      setCurrentBotIds(groupConfig.botIds || []);
    } else {
      form.reset({ name: '', description: '', avatarUrl: ''});
      setCurrentBotIds([]);
    }
  }, [groupConfig, form, isOpen]);

  const onSubmitDetails: SubmitHandler<ManageBotGroupFormValues> = async (data) => {
    if (!groupConfig) return;
    setIsLoading(true);
    try {
      // Call parent handler to update Firestore and parent state
      await onBotGroupUpdated({
        id: groupConfig.id,
        name: data.name,
        description: data.description || undefined,
        avatarUrl: data.avatarUrl || undefined,
        botIds: currentBotIds, // Send current bot IDs state from dialog for update
      });
      // Toast is handled by parent
    } catch (error) {
      console.error("Error submitting group details update:", error);
      toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBotSelection = async (botId: string) => {
    if (!groupConfig) return;
    setIsLoading(true);
    const isCurrentlySelected = currentBotIds.includes(botId);
    try {
      if (isCurrentlySelected) {
        await onRemoveBotFromGroup(groupConfig.id, botId);
        setCurrentBotIds(prev => prev.filter(id => id !== botId));
      } else {
        await onAddBotToGroup(groupConfig.id, botId);
        setCurrentBotIds(prev => [...prev, botId]);
      }
      // Parent's onAddBotToGroup/onRemoveBotFromGroup should handle toast
    } catch (error) {
       // Parent should also handle toast for these errors
       console.error(`Error ${isCurrentlySelected ? 'removing' : 'adding'} bot:`, error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupConfig) return;
    setIsLoading(true);
    try {
      await onBotGroupDeleted(groupConfig.id);
      // Toast & dialog close handled by parent
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!groupConfig) return null;

  const availableBots = [
    ...userBots.map(b => ({ id: b.id, name: `${b.name} (My Bot)`, type: 'user' })),
    ...platformAndPublicAis
        .filter(p => p.id !== groupConfig.ownerUserId) // Exclude self if platform AI is user
        .map(p => ({ id: p.id, name: `${p.name} (${p.isUserCreated ? 'Community' : 'Platform'})`, type: 'public' }))
  ].filter((bot, index, self) => 
    index === self.findIndex((b) => b.id === bot.id) 
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BotGroupsIcon className="text-primary" /> Manage Group: {groupConfig.name}</DialogTitle>
          <DialogDescription>
            Edit group details and manage member bots.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-1 pr-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4 border-b pb-6 mb-6">
              <h3 className="text-lg font-medium text-foreground">Group Details</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea {...field} value={field.value ?? ''} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL (Optional)</FormLabel>
                    <FormControl><Input type="url" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} size="sm">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Details
              </Button>
            </form>
          </Form>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Manage Bots In Group</h3>
            {availableBots.length === 0 && <p className="text-sm text-muted-foreground">No other bots available to add.</p>}
            <ScrollArea className="max-h-60 border rounded-md">
              <div className="p-4 space-y-2">
                {availableBots.map(bot => (
                  <div key={bot.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <Label htmlFor={`bot-select-${bot.id}`} className="flex-1 cursor-pointer text-sm">{bot.name}</Label>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleToggleBotSelection(bot.id)}
                        disabled={isLoading}
                        className={currentBotIds.includes(bot.id) ? "text-destructive hover:text-destructive/80" : "text-primary hover:text-primary/80"}
                        aria-label={currentBotIds.includes(bot.id) ? `Remove ${bot.name} from group` : `Add ${bot.name} to group`}
                    >
                        {currentBotIds.includes(bot.id) ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-6 flex flex-col sm:flex-row sm:justify-between items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoading} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the group
                  &quot;{groupConfig.name}&quot;. Bots will only be disassociated, not deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGroup} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                  {isLoading ? <Loader2 className="animate-spin" /> : "Delete Group"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading} className="w-full sm:w-auto mt-2 sm:mt-0">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

