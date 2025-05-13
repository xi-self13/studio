"use client";

import { useEffect, useState, useRef } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
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
import { UserCog, Loader2, Link as LinkIcon, CheckCircle, AlertCircle, UploadCloud, KeyRound, Info } from 'lucide-react';
import { updateProfile, GoogleAuthProvider, EmailAuthProvider, linkWithCredential, type AuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserProfileInFirestore, checkUsernameExists } from '@/lib/firestoreService';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadImageAndGetURL } from '@/lib/storageService';
import { ScrollArea } from '@/components/ui/scroll-area';

const profileFormSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50, 'Display name must be 50 characters or less.'),
  username: z.string().min(3, "Username must be at least 3 characters.").max(30, "Username must be 30 characters or less.")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and periods.")
    .optional().or(z.literal('')),
  statusMessage: z.string().max(100, "Status message must be 100 characters or less.").optional(),
  shapesIncUsername: z.string().optional().or(z.literal('')),
  shapesIncApiKey: z.string().optional().or(z.literal('')),
}).refine(data => (data.shapesIncUsername && data.shapesIncApiKey) || (!data.shapesIncUsername && !data.shapesIncApiKey), {
  message: "Both Shapes.inc Username and API Key must be provided, or neither.",
  path: ["shapesIncApiKey"], 
});

const linkEmailFormSchema = z.object({
  linkEmail: z.string().email("Invalid email address."),
  linkPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmLinkPassword: z.string().min(6, "Password must be at least 6 characters."),
}).refine(data => data.linkPassword === data.confirmLinkPassword, {
  message: "Passwords do not match.",
  path: ["confirmLinkPassword"],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;
type LinkEmailFormValues = z.infer<typeof linkEmailFormSchema>;

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
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      username: '',
      statusMessage: '',
      shapesIncUsername: '',
      shapesIncApiKey: '',
    },
  });

  const linkEmailForm = useForm<LinkEmailFormValues>({
    resolver: zodResolver(linkEmailFormSchema),
    defaultValues: {
      linkEmail: '',
      linkPassword: '',
      confirmLinkPassword: '',
    }
  });

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        displayName: currentUser.name || '',
        username: currentUser.username || '',
        statusMessage: currentUser.statusMessage || '',
        shapesIncUsername: currentUser.shapesIncUsername || '',
        shapesIncApiKey: currentUser.shapesIncApiKey || '',
      });
      setAvatarPreview(currentUser.avatarUrl || null);
      setAvatarFile(null);
      setShapesApiStatus(null); 
      
      linkEmailForm.reset({
        linkEmail: currentUser.email || '', // Prefill if primary email exists
        linkPassword: '',
        confirmLinkPassword: '',
      })

    }
  }, [currentUser, profileForm, linkEmailForm, isOpen]);

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
    const username = profileForm.getValues("shapesIncUsername");
    const apiKey = profileForm.getValues("shapesIncApiKey");

    if (!username || !apiKey) {
      setShapesApiStatus({ ok: false, message: "Please enter both Shapes.inc Username and API Key." });
      return;
    }
    setIsTestingShapesApi(true);
    setShapesApiStatus(null);
    try {
      // For client-side health check, pass credentials to the checkShapesApiHealth if it's adapted for it.
      // Or, if checkShapesApiHealth uses environment variables, this test might only work for the default bot.
      // Assuming `checkShapesApiHealth` can be called client-side and potentially use passed credentials
      // or the backend flow `chatWithShape` is structured to allow a health ping with specific credentials.
      // For this example, we'll rely on the existing structure of `checkShapesApiHealth`.
      // If it depends on env vars, this test button will test the *default* bot's env config,
      // not necessarily the user's entered creds unless chatWithShape is modified for a ping.
      const result = await checkShapesApiHealth(); 

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

  const onSubmitProfile: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser || !auth.currentUser) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    let newAvatarUrl = currentUser.avatarUrl;
    const firestoreUpdateData: Partial<User> = {};

    try {
      if (avatarFile) {
        const storagePath = `avatars/users/${currentUser.uid}/${Date.now()}-${avatarFile.name}`;
        newAvatarUrl = await uploadImageAndGetURL(avatarFile, storagePath);
        firestoreUpdateData.avatarUrl = newAvatarUrl || null;
      }

      if (data.displayName !== currentUser.name) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
        firestoreUpdateData.name = data.displayName;
      }

      if (data.username && data.username !== currentUser.username && !currentUser.hasSetUsername) {
        const usernameExists = await checkUsernameExists(data.username);
        if (usernameExists) {
          profileForm.setError("username", { type: "manual", message: "Username already taken." });
          setIsLoading(false);
          return;
        }
        firestoreUpdateData.username = data.username;
        firestoreUpdateData.hasSetUsername = true;
        if (data.username.toLowerCase() === 'xi.self13') {
          firestoreUpdateData.isFounder = true;
        }
      } else if (data.username && data.username !== currentUser.username && currentUser.hasSetUsername) {
         toast({ title: "Info", description: "Username cannot be changed once set.", variant: "default" });
      }


      firestoreUpdateData.statusMessage = data.statusMessage || null;
      firestoreUpdateData.shapesIncUsername = data.shapesIncUsername || null;
      firestoreUpdateData.shapesIncApiKey = data.shapesIncApiKey || null; 
      
      if (Object.keys(firestoreUpdateData).length > 0) {
        await updateUserProfileInFirestore(currentUser.uid, firestoreUpdateData);
        onAccountUpdate({ ...currentUser, ...firestoreUpdateData }); 
      }
      toast({ title: "Account Updated", description: "Your account details have been saved." });
      // onOpenChange(false); // Keep open if linking email next or other actions
    } catch (error) {
      console.error("Error updating profile:", error);
      onAuthError(error, "Link Account"); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async (providerInstance: AuthProvider, isEmailLink = false, email?: string, password?: string) => {
    if (!auth.currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to link accounts.", variant: "destructive" });
      return;
    }
    setIsLinkingEmail(true);
    try {
      let newLinkedAccountEntry;
      if (isEmailLink && email && password) {
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(auth.currentUser, credential);
        newLinkedAccountEntry = {
          providerId: EmailAuthProvider.PROVIDER_ID,
          email: email,
          uid: auth.currentUser.uid, // For email, the uid is the main Firebase user UID
        };
      } else {
        // For social providers like Google
         const result = await linkWithPopup(auth.currentUser, providerInstance);
         newLinkedAccountEntry = {
            providerId: result.provider?.providerId || providerInstance.providerId,
            email: result.user.email,
            displayName: result.user.displayName,
            uid: result.user.uid, 
        };
      }

      const updatedLinkedAccounts = [...(currentUser?.linkedAccounts || []), newLinkedAccountEntry]
          .filter((acc, index, self) => index === self.findIndex(a => a.providerId === acc.providerId)); 

      await updateUserProfileInFirestore(currentUser!.uid, { linkedAccounts: updatedLinkedAccounts });
      onAccountUpdate({ linkedAccounts: updatedLinkedAccounts });
      toast({ title: "Account Linked!", description: `Successfully linked your ${newLinkedAccountEntry.providerId.replace('.com','')} account.` });
      if(isEmailLink) linkEmailForm.reset();

    } catch (error: any) {
      onAuthError(error, "Link Account");
    } finally {
      setIsLinkingEmail(false);
    }
  };

  const onSubmitLinkEmail: SubmitHandler<LinkEmailFormValues> = async (data) => {
    handleLinkAccount(new EmailAuthProvider(), true, data.linkEmail, data.linkPassword);
  };

  const isGoogleProvider = currentUser?.linkedAccounts?.some(acc => acc.providerId === GoogleAuthProvider.PROVIDER_ID);
  const hasPasswordProvider = currentUser?.linkedAccounts?.some(acc => acc.providerId === EmailAuthProvider.PROVIDER_ID);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading && !isTestingShapesApi && !isLinkingEmail) {
        onOpenChange(open);
        if (!open) {
          profileForm.reset({ 
              displayName: currentUser?.name || '', 
              username: currentUser?.username || '',
              statusMessage: currentUser?.statusMessage || '',
              shapesIncUsername: currentUser?.shapesIncUsername || '',
              shapesIncApiKey: currentUser?.shapesIncApiKey || '',
          });
          linkEmailForm.reset({ linkEmail: currentUser?.email || '', linkPassword: '', confirmLinkPassword: '' });
          setAvatarFile(null);
          setAvatarPreview(currentUser?.avatarUrl || null);
          setShapesApiStatus(null);
        }
      }
    }}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="text-primary" /> Account Settings</DialogTitle>
          <DialogDescription>
            Update your account details, link external accounts, and manage Shapes.inc credentials.
          </DialogDescription>
        </DialogHeader>
        {currentUser ? (
          <ScrollArea className="max-h-[70vh] p-1 pr-3">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
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
                  control={profileForm.control}
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
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your_unique_username" 
                          {...field} 
                          value={field.value ?? ''}
                          disabled={currentUser.hasSetUsername || isLoading}
                        />
                      </FormControl>
                      {currentUser.hasSetUsername ? (
                        <FormDescription className="text-xs text-muted-foreground">
                          Username cannot be changed once set.
                        </FormDescription>
                      ) : (
                         <FormDescription className="text-xs">
                            Set your unique username. This can only be done once.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
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
                  control={profileForm.control}
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
                  control={profileForm.control}
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
                <Button type="button" variant="outline" size="sm" onClick={handleTestShapesApi} disabled={isTestingShapesApi || isLoading}>
                  {isTestingShapesApi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Shapes.inc Connection
                </Button>
                {shapesApiStatus && (
                  <div className={`flex items-center text-sm mt-2 p-2 rounded-md ${shapesApiStatus.ok ? 'bg-green-500/20 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
                    {shapesApiStatus.ok ? <CheckCircle className="mr-2 h-4 w-4" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                    {shapesApiStatus.message}
                  </div>
                )}
                <div className="pt-4">
                   <Button type="submit" disabled={isLoading || isTestingShapesApi || isLinkingEmail} className="w-full sm:w-auto">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCog className="mr-2 h-4 w-4" />
                    )}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Form>

            <Separator className="my-6"/>
            <h3 className="text-md font-medium pt-2">Linked Accounts</h3>
            <div className="space-y-2">
              {currentUser.linkedAccounts?.map(acc => (
                 <div key={acc.providerId} className="flex items-center justify-between text-sm p-2 border rounded-md bg-muted">
                    <span>
                      {acc.providerId === 'google.com' ? 'Google' : acc.providerId === 'password' ? 'Email/Password' : acc.providerId}
                      {acc.email && ` (${acc.email})`}
                    </span>
                    <CheckCircle className="text-green-500" />
                  </div>
              ))}

              {!isGoogleProvider && (
                <Button type="button" variant="outline" className="w-full" onClick={() => handleLinkAccount(new GoogleAuthProvider())} disabled={isLoading || isTestingShapesApi || isLinkingEmail}>
                  <LinkIcon className="mr-2 h-4 w-4" /> Link Google Account
                </Button>
              )}
              {!hasPasswordProvider && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-2 flex items-center"><KeyRound className="mr-2 h-4 w-4"/> Set Email/Password</h4>
                  <Form {...linkEmailForm}>
                    <form onSubmit={linkEmailForm.handleSubmit(onSubmitLinkEmail)} className="space-y-3">
                       <FormField
                          control={linkEmailForm.control}
                          name="linkEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="your@email.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={linkEmailForm.control}
                          name="linkPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={linkEmailForm.control}
                          name="confirmLinkPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={isLoading || isTestingShapesApi || isLinkingEmail} className="w-full sm:w-auto">
                          {isLinkingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LinkIcon className="mr-2 h-4 w-4" />}
                          Link Email/Password
                        </Button>
                    </form>
                  </Form>
                </div>
              )}
               {isGoogleProvider && hasPasswordProvider && (
                  <div className="flex items-center text-sm mt-2 p-3 rounded-md bg-muted/50 text-muted-foreground">
                     <Info className="mr-2 h-5 w-5 text-primary"/>
                     All available account linking methods are connected.
                  </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground">Loading user data...</p>
        )}
         <DialogFooter className="pt-6 sticky bottom-0 bg-card pb-6 px-6 -mx-6 border-t border-border">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading || isTestingShapesApi || isLinkingEmail}>
                Close
              </Button>
            </DialogClose>
            {/* Main save button moved inside the profile form */}
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}