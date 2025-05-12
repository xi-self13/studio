
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BotConfig } from '@/types';
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
  FormDescription as FormFieldDescription, 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Cpu, Loader2 } from 'lucide-react';
import { saveUserBotConfigToFirestore } from '@/lib/firestoreService';

const formSchema = z.object({
  name: z.string().min(2, 'Bot name must be at least 2 characters.').max(50, 'Bot name must be 50 characters or less.'),
  shapeUsername: z.string().min(1, 'Shapes.inc username is required.'),
  apiKey: z.string().min(1, 'Shapes.inc API key is required.'),
  isPublic: z.boolean().default(false).optional(),
  // avatarUrl removed - will be set via BotSettingsDialog
});

type CreateBotFormValues = z.infer<typeof formSchema>;

interface CreateBotDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBotCreated: (botConfig: BotConfig) => void;
  currentUserId: string; 
}

export function CreateBotDialog({ 
  isOpen, 
  onOpenChange, 
  onBotCreated,
  currentUserId,
}: CreateBotDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateBotFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      shapeUsername: '',
      apiKey: '',
      isPublic: false,
    },
  });

  const onSubmit: SubmitHandler<CreateBotFormValues> = async (data) => {
    if (!currentUserId) {
      toast({ title: "Error", description: "User not authenticated. Cannot create bot.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const newBotConfig: BotConfig = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
        name: data.name,
        shapeUsername: data.shapeUsername,
        apiKey: data.apiKey, 
        ownerUserId: currentUserId,
        isPublic: data.isPublic || false,
        avatarUrl: undefined, // Avatar will be set via BotSettingsDialog
      };

      await saveUserBotConfigToFirestore(newBotConfig); 
      
      onBotCreated(newBotConfig); 
      toast({ title: "Bot Created!", description: `${data.name} is ready. Customize its avatar and personality in its settings.` });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating bot:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while saving the bot.";
      toast({
        title: "Error Creating Bot",
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
          <DialogTitle className="flex items-center gap-2"><Cpu className="text-primary" /> Create Your AI Bot</DialogTitle>
          <DialogDescription>
            Configure your own AI bot using its Shapes.inc username and API key.
            You can set the avatar and personality in the bot's settings after creation.
            <strong className="block mt-1 text-destructive-foreground/80">Note: API keys are sensitive. This is for demonstration. In a real app, handle keys securely.</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Helper Bot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shapeUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shapes.inc Username</FormLabel>
                  <FormControl>
                    <Input placeholder="your-shape-username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shapes.inc API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="your-shapes-api-key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="isPublic" className="font-medium">
                      Make Bot Public
                    </Label>
                    <FormFieldDescription className="text-xs">
                      If checked, other users will be able to see and interact with this bot in public listings.
                    </FormFieldDescription>
                  </div>
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
                  <Cpu className="mr-2 h-4 w-4" />
                )}
                Create Bot
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
