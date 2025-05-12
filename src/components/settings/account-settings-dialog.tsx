
"use client";

import { useEffect, useState, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2, Link as LinkIcon, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { updateProfile, GoogleAuthProvider, linkWithPopup, type AuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserProfileInFirestore } from '@/lib/firestoreService';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadImageAndGetURL } from '@/lib/storageService';

const formSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50, 'Display name must be 50 characters or less.'),
  statusMessage: z.string().max(100, "Status message must be 100 characters or less.").optional(),
  // avatarUrl is handled by file upload, not direct URL input in this version
  shapesIncUsername: z.string().optional().or(z.literal('')),
  shapesIncApiKey: z.string().optional().or(z.literal('')),
}).refine(data => (data.shapesIncUsername && data.shapesIncApiKey) || (!data.shapesIncUsername && !data.shapesIncApiKey), {
  message: "Both Shapes.inc Username and API Key must be provided, or neither.",
  path: ["shapesIncApiKey"], 
});


type AccountSettingsFormValues = z.infer<typeof formSchema>;

interface AccountSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser: User | null;
  onAccountUpdate: (updatedUser: Partial<User>) => void;
  onAuthError: (error: any, actionType: "Login" | "Sign Up" | "Link Account") => void;
}

export function AccountSettingsDialog({
  isOpen,
  onOpenChange,
  currentUser,
  onAccountUpdate,
  onAuthError,
}: AccountSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingShapesApi, setIsTestingShapesApi] = useState(false);
  const [shapesApiStatus, setShapesApiStatus] = useState<{ok: boolean, message: string} | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      statusMessage: '',
      shapesIncUsername: '',
      shapesIncApiKey: '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.name || '',
        statusMessage: currentUser.statusMessage || '',
        shapesIncUsername: currentUser.shapesIncUsername || '',
        shapesIncApiKey: currentUser.shapesIncApiKey || '',
      });
      setAvatarPreview(currentUser.avatarUrl || null);
      setAvatarFile(null);
      setShapesApiStatus(null); 
    }
  }, [currentUser, form, isOpen]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestShapesApi = async () => {
    const username = form.getValues("shapesIncUsername");
    const apiKey = form.getValues("shapesIncApiKey");

    if (!username || !apiKey) {
      setShapesApiStatus({ ok: false, message: "Please enter both Shapes.inc Username and API Key." });
      return;
    }
    setIsTestingShapesApi(true);
    setShapesApiStatus(null);
    try {
      const originalEnvKey = process.env.SHAPESINC_API_KEY;
      const originalEnvUser = process.env.SHAPESINC_SHAPE_USERNAME;
      process.env.SHAPESINC_API_KEY = apiKey;
      process.env.SHAPESINC_SHAPE_USERNAME = username;

      const result = await checkShapesApiHealth();
      
      process.env.SHAPESINC_API_KEY = originalEnvKey;
      process.env.SHAPESINC_SHAPE_USERNAME = originalEnvUser;

      if (result.healthy) {
        setShapesApiStatus({ ok: true, message: "Connection successful!" });
      } else {
        setShapesApiStatus({ ok: false, message: result.error || "Connection failed." });
      }
    } catch (error) {
      setShapesApiStatus({ ok: false, message: error instanceof Error ? error.message : "An unknown error occurred."});
    } finally {
      setIsTestingShapesApi(false);
    }
  };

  const onSubmit: SubmitHandler<AccountSettingsFormValues> = async (data) => {
    if (!currentUser || !auth.currentUser) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    let newAvatarUrl = currentUser.avatarUrl;

    try {
      if (avatarFile) {
        const storagePath = `avatars/users/${currentUser.uid}/${Date.now()}-${avatarFile.name}`;
        newAvatarUrl = await uploadImageAndGetURL(avatarFile, storagePath);
      }

      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: newAvatarUrl || null,
      });

      const firestoreUpdateData: Partial<User> = {
        name: data.displayName,
        statusMessage: data.statusMessage || null,
        avatarUrl: newAvatarUrl || null,
        shapesIncUsername: data.shapesIncUsername || null,
        shapesIncApiKey: data.shapesIncApiKey || null, 
      };
      
      await updateUserProfileInFirestore(currentUser.uid, firestoreUpdateData);
      onAccountUpdate(firestoreUpdateData); 
      toast({ title: "Account Updated", description: "Your account details have been saved." });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      onAuthError(error, "Link Account"); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async (provider: AuthProvider) => {
    if (!auth.currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to link accounts.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await linkWithPopup(auth.currentUser, provider);
      const newLinkedAccount = {
        providerId: result.providerId,
        email: result.user.email,
        displayName: result.user.displayName,
      };
      const updatedLinkedAccounts = [...(currentUser?.linkedAccounts || []), newLinkedAccount]
        .filter((acc, index, self) => index === self.findIndex(a => a.providerId === acc.providerId)); 

      await updateUserProfileInFirestore(currentUser!.uid, { linkedAccounts: updatedLinkedAccounts });
      onAccountUpdate({ linkedAccounts: updatedLinkedAccounts });
      toast({ title: "Account Linked!", description: `Successfully linked your ${result.providerId.replace('.com','')} account.` });
    } catch (error: any) {
      onAuthError(error, "Link Account");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading && !isTestingShapesApi) {
        onOpenChange(open);
        if (!open) {
          form.reset({ 
              displayName: currentUser?.name || '', 
              statusMessage: currentUser?.statusMessage || '',
              shapesIncUsername: currentUser?.shapesIncUsername || '',
              shapesIncApiKey: currentUser?.shapesIncApiKey || '',
          });
          setAvatarFile(null);
          setAvatarPreview(currentUser?.avatarUrl || null);
          setShapesApiStatus(null);
        }
      }
    }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="text-primary" /> Account Settings</DialogTitle>
          <DialogDescription>
            Update your account details, link external accounts, and manage Shapes.inc credentials. Email cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        {currentUser ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-24 w-24 ring-2 ring-primary ring-offset-2 ring-offset-background">
                  <AvatarImage src={avatarPreview || undefined} alt={currentUser.name || "User avatar"} data-ai-hint="user profile large" />
                  <AvatarFallback className="text-3xl">
                    {currentUser.name ? currentUser.name.substring(0,1).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Change Avatar
                </Button>
                <Input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                 {avatarFile && <p className="text-xs text-muted-foreground truncate max-w-xs">Selected: {avatarFile.name}</p>}
              </div>

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

              <Separator />
              <h3 className="text-md font-medium pt-2">Shapes.inc Credentials</h3>
               <FormDescription className="text-xs -mt-2">
                Link your Shapes.inc account to use with the default AI assistant or your custom bots.
               </FormDescription>
              <FormField
                control={form.control}
                name="shapesIncUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shapes.inc Username</FormLabel>
                    <FormControl>
                      <Input placeholder="your-shape-username" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shapesIncApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shapes.inc API Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="your-shapes-api-key" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleTestShapesApi} disabled={isTestingShapesApi}>
                {isTestingShapesApi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Shapes.inc Connection
              </Button>
              {shapesApiStatus && (
                <div className={`flex items-center text-sm mt-2 p-2 rounded-md ${shapesApiStatus.ok ? 'bg-green-500/20 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
                  {shapesApiStatus.ok ? <CheckCircle className="mr-2 h-4 w-4" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                  {shapesApiStatus.message}
                </div>
              )}

              <Separator />
              <h3 className="text-md font-medium pt-2">Linked Accounts</h3>
              <div className="space-y-2">
                {currentUser.linkedAccounts?.find(acc => acc.providerId === GoogleAuthProvider.PROVIDER_ID) ? (
                   <div className="flex items-center justify-between text-sm p-2 border rounded-md bg-muted">
                     <span>Google ({currentUser.linkedAccounts.find(acc => acc.providerId === GoogleAuthProvider.PROVIDER_ID)?.email})</span>
                     <CheckCircle className="text-green-500" />
                   </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => handleLinkAccount(new GoogleAuthProvider())} disabled={isLoading}>
                    <LinkIcon className="mr-2 h-4 w-4" /> Link Google Account
                  </Button>
                )}
              </div>


              <DialogFooter className="pt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isLoading || isTestingShapesApi}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || isTestingShapesApi}>
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
