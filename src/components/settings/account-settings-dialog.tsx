
"use client";

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User } from '@/types';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Added for status message
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserProfileInFirestore } from '@/lib/firestoreService'; // For updating Firestore

const formSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50, 'Display name must be 50 characters or less.'),
  statusMessage: z.string().max(100, "Status message must be 100 characters or less.").optional(),
  avatarUrl: z.string().url("Must be a valid URL for avatar image.").optional().or(z.literal('')),
});

type AccountSettingsFormValues = z.infer<typeof formSchema>;

interface AccountSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser: User | null;
  onAccountUpdate: (updatedUser: User) => void;
}

export function AccountSettingsDialog({
  isOpen,
  onOpenChange,
  currentUser,
  onAccountUpdate,
}: AccountSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: currentUser?.name || '',
      statusMessage: currentUser?.statusMessage || '',
      avatarUrl: currentUser?.avatarUrl || '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.name || '',
        statusMessage: currentUser.statusMessage || '',
        avatarUrl: currentUser.avatarUrl || '',
      });
    }
  }, [currentUser, form, isOpen]);

  const onSubmit: SubmitHandler<AccountSettingsFormValues> = async (data) => {
    if (!currentUser || !auth.currentUser) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: data.avatarUrl || null, // Pass null if empty to potentially clear it
      });

      // Prepare data for Firestore update
      const firestoreUpdateData: Partial<Pick<User, 'name' | 'avatarUrl' | 'statusMessage'>> = {
        name: data.displayName,
        statusMessage: data.statusMessage || null, // Store null if empty
        avatarUrl: data.avatarUrl || null,
      };
      
      await updateUserProfileInFirestore(currentUser.uid, firestoreUpdateData);

      const updatedUser: User = {
        ...currentUser,
        name: data.displayName,
        statusMessage: data.statusMessage || undefined, // Reflect undefined if empty in local state
        avatarUrl: data.avatarUrl || undefined,
      };
      onAccountUpdate(updatedUser);

      toast({ title: "Account Updated", description: "Your account details have been updated." });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) {
        onOpenChange(open);
        if (!open) form.reset({ 
            displayName: currentUser?.name || '', 
            statusMessage: currentUser?.statusMessage || '',
            avatarUrl: currentUser?.avatarUrl || ''
        });
      }
    }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="text-primary" /> Account Settings</DialogTitle>
          <DialogDescription>
            Update your account details. Email cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        {currentUser ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
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
                name="statusMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What are you up to?" {...field} value={field.value ?? ''} rows={2} />
                    </FormControl>
                     <FormDescription className="text-xs">
                        A short message that others can see. (Max 100 chars)
                    </FormDescription>
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
                    <UserCog className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <p className="text-muted-foreground">Loading user data...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
