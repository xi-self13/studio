
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Server } from '@/types';
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
import { Server as ServerIcon, Loader2 } from 'lucide-react';
import { createServerInFirestore } from '@/lib/firestoreService';

const formSchema = z.object({
  name: z.string().min(2, 'Server name must be at least 2 characters.').max(50, 'Server name must be 50 characters or less.'),
  avatarUrl: z.string().url("Must be a valid URL for server icon.").optional().or(z.literal('')),
  isCommunity: z.boolean().default(false).optional(),
});

type CreateServerFormValues = z.infer<typeof formSchema>;

interface CreateServerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserId: string;
  onServerCreated: (server: Server) => void;
}

export function CreateServerDialog({
  isOpen,
  onOpenChange,
  currentUserId,
  onServerCreated,
}: CreateServerDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateServerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
      isCommunity: false,
    },
  });

  const onSubmit: SubmitHandler<CreateServerFormValues> = async (data) => {
    if (!currentUserId) {
      toast({ title: "Error", description: "User not authenticated. Cannot create server.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const newServer = await createServerInFirestore({
        name: data.name,
        ownerUserId: currentUserId,
        avatarUrl: data.avatarUrl || undefined,
        dataAiHint: 'server icon group community', 
        isCommunity: data.isCommunity || false,
      });
      
      onServerCreated(newServer);
      form.reset();
      // Toast is handled by parent in onServerCreated
    } catch (error) {
      console.error("Error creating server:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Creating Server",
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
          <DialogTitle className="flex items-center gap-2"><ServerIcon className="text-primary" /> Create a New Server</DialogTitle>
          <DialogDescription>
            Give your new server a name, an optional icon, and set its visibility.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Awesome Community" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Icon URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/server-icon.png" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="isCommunity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="isCommunityServer"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="isCommunityServer" className="font-medium">
                      Community Server
                    </Label>
                    <FormFieldDescription className="text-xs">
                      If checked, this server will be publicly discoverable.
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
                  <ServerIcon className="mr-2 h-4 w-4" />
                )}
                Create Server
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

