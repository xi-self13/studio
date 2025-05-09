
"use client";

import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Cpu, Loader2, Save } from 'lucide-react';
import { saveUserBotConfigToFirestore } from '@/lib/firestoreService';

const formSchema = z.object({
  name: z.string().min(2, 'Bot name must be at least 2 characters.').max(50, 'Bot name must be 50 characters or less.'),
  systemPrompt: z.string().max(1000, "System prompt too long (max 1000 chars).").optional(),
  greetingMessage: z.string().max(500, "Greeting message too long (max 500 chars).").optional(),
  isPublic: z.boolean().default(false).optional(),
  avatarUrl: z.string().url("Must be a valid URL for avatar image.").optional().or(z.literal('')),
});

type BotSettingsFormValues = z.infer<typeof formSchema>;

interface BotSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botConfig: BotConfig | null;
  onBotConfigUpdated: (updatedBotConfig: BotConfig) => void;
}

export function BotSettingsDialog({
  isOpen,
  onOpenChange,
  botConfig,
  onBotConfigUpdated,
}: BotSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<BotSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: botConfig?.name || '',
      systemPrompt: botConfig?.systemPrompt || '',
      greetingMessage: botConfig?.greetingMessage || '',
      isPublic: botConfig?.isPublic || false,
      avatarUrl: botConfig?.avatarUrl || '',
    },
  });

  useEffect(() => {
    if (botConfig) {
      form.reset({
        name: botConfig.name,
        systemPrompt: botConfig.systemPrompt || '',
        greetingMessage: botConfig.greetingMessage || '',
        isPublic: botConfig.isPublic || false,
        avatarUrl: botConfig.avatarUrl || '',
      });
    }
  }, [botConfig, form, isOpen]);


  const onSubmit: SubmitHandler<BotSettingsFormValues> = async (data) => {
    if (!botConfig) {
      toast({ title: "Error", description: "No bot selected for editing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const updatedBotConfig: BotConfig = {
        ...botConfig, // Preserve existing fields like id, ownerUserId, apiKey, shapeUsername
        name: data.name,
        systemPrompt: data.systemPrompt || undefined,
        greetingMessage: data.greetingMessage || undefined,
        isPublic: data.isPublic || false,
        avatarUrl: data.avatarUrl || undefined,
      };

      await saveUserBotConfigToFirestore(updatedBotConfig);
      onBotConfigUpdated(updatedBotConfig);
      toast({ title: "Bot Settings Updated", description: `${updatedBotConfig.name}'s settings have been saved.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating bot settings:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!botConfig) return null; // Should not happen if dialog is opened correctly

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Cpu className="text-primary" /> Bot Settings: {botConfig.name}</DialogTitle>
          <DialogDescription>
            Customize your AI bot's behavior and appearance. API Key and Shape Username cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
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
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt (Personality)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., You are a cheerful assistant that loves to talk about shapes." {...field} value={field.value ?? ''} rows={4}/>
                  </FormControl>
                  <FormFieldDescription className="text-xs">
                    Instructions for the AI's general behavior and personality. (Max 1000 chars)
                  </FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="greetingMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Greeting Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Hello there! Ready to explore some shapes?" {...field} value={field.value ?? ''} rows={2}/>
                  </FormControl>
                   <FormFieldDescription className="text-xs">
                    The first message this bot will send when a user starts a DM. (Max 500 chars)
                  </FormFieldDescription>
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
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/avatar.png" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id={`isPublic-${botConfig.id}`}
                    />
                  </FormControl>
                  <div className="leading-none">
                    <Label htmlFor={`isPublic-${botConfig.id}`} className="font-medium">
                      Make Bot Public
                    </Label>
                    <FormFieldDescription className="text-xs mt-1">
                      Allow other users to discover and interact with this bot.
                    </FormFieldDescription>
                  </div>
                   <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
