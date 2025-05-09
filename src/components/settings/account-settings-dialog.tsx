
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const formSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50, 'Display name must be 50 characters or less.'),
  // username: z.string().min(3, "Username must be at least 3 characters.").max(30, "Username must be 30 characters or less.").optional(), // Future use
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
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.name || '',
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
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
      });

      const updatedUser: User = {
        ...currentUser,
        name: data.displayName,
      };
      onAccountUpdate(updatedUser);

      toast({ title: "Account Updated", description: "Your display name has been updated." });
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
        if (!open) form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="text-primary" /> Account Settings</DialogTitle>
          <DialogDescription>
            Update your account details.
          </DialogDescription>
        </DialogHeader>
        {currentUser ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              {/* Example for a username field if added later
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="your_username" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}
              <DialogFooter>
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
