
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BotGroup } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { Users2 as BotGroupsIcon, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters.').max(50, 'Group name must be 50 characters or less.'),
  description: z.string().max(500, "Description too long (max 500 chars).").optional(),
  // avatarUrl removed - will be set via ManageBotGroupDialog
});

type CreateBotGroupFormValues = z.infer<typeof formSchema>;

interface CreateBotGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBotGroupCreated: (botGroupData: Omit<BotGroup, 'id' | 'ownerUserId'>) => void;
  currentUserId: string;
}

export function CreateBotGroupDialog({
  isOpen,
  onOpenChange,
  onBotGroupCreated,
  currentUserId,
}: CreateBotGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateBotGroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit: SubmitHandler<CreateBotGroupFormValues> = async (data) => {
    if (!currentUserId) {
      toast({ title: "Error", description: "User not authenticated. Cannot create group.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const newBotGroupData: Omit<BotGroup, 'id' | 'ownerUserId'> = {
        name: data.name,
        description: data.description || undefined,
        avatarUrl: undefined, // Avatar will be set via ManageBotGroupDialog
        botIds: [], 
        memberUserIds: [currentUserId], 
      };
      
      onBotGroupCreated(newBotGroupData); 

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting bot group creation form:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Creating Group",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) {
        onOpenChange(open);
        if (!open) form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BotGroupsIcon className="text-primary" /> Create New Bot Group</DialogTitle>
          <DialogDescription>
            Organize your AI bots into groups. You can set the group avatar in the group's settings after creation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Support Team Bots" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Textarea placeholder="What is this group about?" {...field} value={field.value ?? ''} rows={3}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading || !currentUserId}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BotGroupsIcon className="mr-2 h-4 w-4" />
                )}
                Create Group
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
