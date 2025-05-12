
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Channel, Message, User, BotConfig, PlatformShape, BotGroup, TypingIndicator } from '@/types';
import { MainChannelSidebarContent } from '@/components/sidebar/main-channel-sidebar-content';
import { Sidebar, SidebarProvider, SidebarInset, MobileSidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelLeft, Bot, LogIn, LogOut, UserPlus, Cpu, Shapes, Settings, Compass, Users as UsersIcon, Trash2, Edit3, UserCog, Users2 as BotGroupsIcon, Loader2, Share2, Copy, Globe, EyeOff, RefreshCw, MessageSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Hash } from 'lucide-react';
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES } from '@/lib/shapes';
import { checkShapesApiHealth } from '@/lib/shapes-api-utils';
import { CreateBotDialog } from '@/components/bot/create-bot-dialog';
import { BotSettingsDialog } from '@/components/bot/bot-settings-dialog';
import { AccountSettingsDialog } from '@/components/settings/account-settings-dialog';
import { ShapeTalkLogo } from '@/components/icons/logo';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, linkWithPopup } from 'firebase/auth';
import { arrayUnion } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, writeBatch, Timestamp, Unsubscribe } from 'firebase/firestore';
import { 
  getUserBotConfigsFromFirestore, 
  getPlatformShapesFromFirestore, 
  getPublicUserBotsFromFirestore, 
  saveUserBotConfigToFirestore,
  getBotConfigFromFirestore,
  deleteUserBotConfigFromFirestore,
  updateUserProfileInFirestore, 
  setTypingIndicatorInFirestore,
  removeTypingIndicatorFromFirestore,
  saveMessageToFirestore, 
  subscribeToChannelMessages, 
  updateUserLastSeen,
  getAllAppUsers,
  getOrCreateDmChannelBetweenUsers,
  createUserDocument,
} from '@/lib/firestoreService';
import { CreateBotGroupDialog } from '@/components/bot-groups/create-bot-group-dialog';
import { ManageBotGroupDialog } from '@/components/bot-groups/manage-bot-group-dialog';
import { 
  getOwnedBotGroupsFromFirestore, 
  createBotGroup as createBotGroupInFirestore, 
  updateBotGroup as updateBotGroupInFirestore, 
  deleteBotGroupFromFirestore as deleteBotGroupFS, 
  addBotToGroupInFirestore, 
  removeBotFromGroupInFirestore, 
  getBotGroupFromFirestore as getBotGroupFS 
} from '@/lib/firestoreService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatView } from '@/components/chat/chat-view';
import { useSearchParams, useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; 

const USERS_COLLECTION = 'users';
const TYPING_INDICATOR_TIMEOUT = 5000; 
const TYPING_INDICATORS_COLLECTION = 'typingIndicators';

const DEFAULT_BOT_CHANNEL_ID = 'shapes-ai-chat'; 
const DEFAULT_AI_BOT_USER_ID = 'AI_BOT_DEFAULT';
const AI_LOUNGE_CHANNEL_ID = 'ai-lounge-global'; 

const staticChannelsData: Channel[] = [
  { id: DEFAULT_BOT_CHANNEL_ID, name: 'shapes-ai-chat', type: 'dm', icon: Bot, isBotChannel: true, botId: DEFAULT_AI_BOT_USER_ID, members: ['placeholderCurrentUser', DEFAULT_AI_BOT_USER_ID] }, 
  { id: AI_LOUNGE_CHANNEL_ID, name: 'AI Lounge', type: 'channel', icon: MessageSquare, isAiLounge: true }, 
];

export default function ShapeTalkPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); // Includes current user, bots, and other app users for context
  const [allAppUsers, setAllAppUsers] = useState<User[]>([]); // List of all non-bot users for DMs
  const [userBots, setUserBots] = useState<BotConfig[]>([]);
  const [platformAndPublicAis, setPlatformAndPublicAis] = useState<PlatformShape[]>([]);
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [hasSentInitialBotMessageForChannel, setHasSentInitialBotMessageForChannel] = useState<Record<string, boolean>>({});
  const [isCreateBotDialogOpen, setIsCreateBotDialogOpen] = useState(false);
  const [isBotSettingsDialogOpen, setIsBotSettingsDialogOpen] = useState(false);
  const [selectedBotToEdit, setSelectedBotToEdit] = useState<BotConfig | null>(null);
  const [isAccountSettingsDialogOpen, setIsAccountSettingsDialogOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingUserBots, setIsLoadingUserBots] = useState(false);
  const [isLoadingPlatformAis, setIsLoadingPlatformAis] = useState(false);
  const [isLoadingBotGroups, setIsLoadingBotGroups] = useState(false);
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [botGroups, setBotGroups] = useState<BotGroup[]>([]);
  const [isCreateBotGroupDialogOpen, setIsCreateBotGroupDialogOpen] = useState(false);
  const [isManageBotGroupDialogOpen, setIsManageBotGroupDialogOpen] = useState(false);
  const [selectedGroupToManage, setSelectedGroupToManage] = useState<BotGroup | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageListenerUnsubscribeRef = useRef<Unsubscribe | null>(null); 

  const searchParams = useSearchParams();
  const router = useRouter();


  const { toast } = useToast();

  const sendBotMessageUtil = useCallback(async (channelId: string, botUserId: string, text: string, type: 'text' | 'ai_response' = 'text', prompt?: string, sourceShapeId?: string) => {
    const botMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: botUserId,
      content: type === 'ai_response' ? { type, textResponse: text, prompt, sourceShapeId } : { type, text },
      timestamp: Date.now(),
    };
    await saveMessageToFirestore(botMessage);
  }, []);

  const loadAllAppUsers = useCallback(async () => {
    setIsLoadingAllUsers(true);
    try {
      const fetchedUsers = await getAllAppUsers();
      setAllAppUsers(fetchedUsers.filter(u => u.uid !== currentUser?.uid)); // Exclude current user
      setUsers(prev => { // Ensure users state also has these app users
        const existingUserIds = new Set(prev.map(u => u.uid));
        const newUsersToAdd = fetchedUsers.filter(fu => !existingUserIds.has(fu.uid));
        return [...prev, ...newUsersToAdd];
      });
    } catch (error) {
      console.error("Failed to load all app users:", error);
      toast({ title: "Error Loading Users", description: "Could not fetch other users.", variant: "destructive" });
    } finally {
      setIsLoadingAllUsers(false);
    }
  }, [toast, currentUser?.uid]);

  const loadPlatformAndPublicAis = useCallback(async function fetchPlatformAndPublicAisLogic() {
    setIsLoadingPlatformAis(true);
    try {
      const fetchedPlatformAis = await getPlatformShapesFromFirestore();
      const fetchedPublicUserBots = await getPublicUserBotsFromFirestore();

      const transformedPublicBots: PlatformShape[] = await Promise.all(
        fetchedPublicUserBots.map(async (bot) => {
          let ownerName = `User ${bot.ownerUserId.substring(0, 6)}`;
          try {
            const ownerDoc = await getDoc(doc(db, USERS_COLLECTION, bot.ownerUserId));
            if (ownerDoc.exists() && ownerDoc.data()?.name) {
              ownerName = ownerDoc.data()?.name;
            }
          } catch (e) { console.warn("Could not fetch owner name for public bot", e); }

          return ({
            id: bot.id,
            name: bot.name,
            description: bot.systemPrompt || 'A user-created public AI bot.',
            avatarUrl: bot.avatarUrl,
            dataAiHint: 'bot avatar user',
            shapeUsername: bot.shapeUsername,
            isUserCreated: true,
            ownerDisplayName: ownerName,
          });
        })
      );

      const combinedAis = [...fetchedPlatformAis, ...transformedPublicBots];
      setPlatformAndPublicAis(combinedAis);

      const aiUsers: User[] = combinedAis.map(pa => ({
        uid: pa.id,
        name: pa.name,
        avatarUrl: pa.avatarUrl,
        dataAiHint: pa.dataAiHint || (pa.isUserCreated ? 'bot avatar user' : 'AI avatar'),
        isBot: true,
      }));
      
      if (!aiUsers.find(u => u.uid === DEFAULT_AI_BOT_USER_ID)) {
        aiUsers.push({
            uid: DEFAULT_AI_BOT_USER_ID,
            name: 'Shape AI (Default)',
            avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
            dataAiHint: 'bot avatar',
            isBot: true,
        });
      }

      setUsers(prevUsers => {
        const existingIds = new Set(prevUsers.map(u => u.uid));
        const newAiUsersToAdd = aiUsers.filter(pu => !existingIds.has(pu.uid));
        return [...prevUsers, ...newAiUsersToAdd];
      });

    } catch (error) {
      console.error("Failed to load platform and public AIs:", error);
      toast({ title: "Error Loading AIs", description: "Could not fetch AI configurations.", variant: "destructive" });
    } finally {
      setIsLoadingPlatformAis(false);
    }
  }, [toast]);

  useEffect(() => {
    const defaultBotUser: User = {
      uid: DEFAULT_AI_BOT_USER_ID,
      name: 'Shape AI (Default)',
      avatarUrl: 'https://picsum.photos/seed/defaultbot/40/40',
      dataAiHint: 'bot avatar',
      isBot: true,
    };
    setUsers(prevUsers => {
      if (!prevUsers.find(u => u.uid === defaultBotUser.uid)) {
        return [defaultBotUser, ...prevUsers];
      }
      return prevUsers;
    });
    
    setChannels(prevChannels => {
      const existingChannelIds = new Set(prevChannels.map(c => c.id));
      const newStaticChannels = staticChannelsData.filter(sc => !existingChannelIds.has(sc.id) && sc.type === 'channel');
      return newStaticChannels.length > 0 ? [...prevChannels, ...newStaticChannels] : prevChannels;
    });
    setDirectMessages(prevDms => {
      const existingDmIds = new Set(prevDms.map(dm => dm.id));
      const newStaticDms = staticChannelsData.filter(sc => !existingDmIds.has(sc.id) && sc.type === 'dm' && sc.isBotChannel); // Only add static bot DMs initially
      return newStaticDms.length > 0 ? [...prevDms, ...newStaticDms] : prevDms;
    });

    async function checkApiStatus() {
      const healthStatus = await checkShapesApiHealth();
      setIsApiHealthy(healthStatus.healthy);
      if (!healthStatus.healthy) {
        toast({
          title: "Shapes API Issue (Default Bot)",
          description: healthStatus.error || "The default Shapes AI bot is currently unavailable. Functionality may be limited.",
          variant: "destructive",
          duration: 10000,
        });
      }
    }
    checkApiStatus();
    loadPlatformAndPublicAis();
    loadAllAppUsers(); // Load all app users
  }, [toast, loadPlatformAndPublicAis, loadAllAppUsers]);

  const loadUserBots = useCallback(async function fetchUserBotsLogic(userId: string) {
    setIsLoadingUserBots(true);
    try {
      const fetchedBotConfigs = await getUserBotConfigsFromFirestore(userId);
      setUserBots(fetchedBotConfigs);

      const botUsers: User[] = fetchedBotConfigs.map(bc => ({
        uid: bc.id,
        name: bc.name,
        avatarUrl: bc.avatarUrl || `https://picsum.photos/seed/${bc.id}/40/40`,
        dataAiHint: 'bot avatar',
        isBot: true,
      }));

      const botDMs: Channel[] = fetchedBotConfigs.map(bc => ({
        id: `dm_${bc.id}_${userId}`,
        name: bc.name,
        type: 'dm', 
        members: [userId, bc.id],
        isBotChannel: true,
        botId: bc.id,
        icon: Bot,
      }));

      setUsers(prevUsers => {
        const currentNonHumanUsers = prevUsers.filter(u => u.isBot);
        const newBotUsersToAdd = botUsers.filter(bu => !currentNonHumanUsers.find(cnhu => cnhu.uid === bu.uid));
        const humanUsers = prevUsers.filter(u => !u.isBot);
        return [...humanUsers, ...currentNonHumanUsers, ...newBotUsersToAdd];
      });
      
      setDirectMessages(prevDms => {
         const existingUserDmIds = new Set(prevDms.filter(dm => dm.isBotChannel && botUsers.find(bu => dm.botId === bu.uid && dm.members?.includes(userId))).map(dm => dm.id));
         const newBotDmsToAdd = botDMs.filter(ndm => !existingUserDmIds.has(ndm.id));
         
         const defaultBotDmForCurrentUser = prevDms.find(dm => dm.isBotChannel && dm.botId === DEFAULT_AI_BOT_USER_ID && dm.members?.includes(userId));
         let otherDms = prevDms.filter(dm => 
            !(dm.isBotChannel && botUsers.find(bu => dm.botId === bu.uid && dm.members?.includes(userId))) && 
            !(dm.isBotChannel && dm.botId === DEFAULT_AI_BOT_USER_ID && dm.members?.includes(userId))
         ); 

         let finalDms = [...otherDms, ...newBotDmsToAdd];
         if (defaultBotDmForCurrentUser && !finalDms.some(dm => dm.id === defaultBotDmForCurrentUser.id)) {
            finalDms.push(defaultBotDmForCurrentUser);
         }

        return finalDms;
      });

    } catch (error) {
      console.error("Failed to load user bots:", error);
      toast({ title: "Error Loading Bots", description: "Could not fetch your custom bot configurations.", variant: "destructive" });
    } finally {
      setIsLoadingUserBots(false);
    }
  }, [toast]); 
  
  const loadUserBotGroups = useCallback(async function fetchUserBotGroupsLogic(userId: string) {
    setIsLoadingBotGroups(true);
    try {
      const groups = await getOwnedBotGroupsFromFirestore(userId);
      setBotGroups(groups);

      const groupChannels: Channel[] = groups.map(group => ({
        id: `group_${group.id}`,
        name: group.name,
        type: 'group', 
        icon: BotGroupsIcon,
        isBotGroup: true,
        groupId: group.id,
        members: [userId, ...(group.botIds || [])], 
      }));
      
      setChannels(prev => {
        const existingGroupChannelIds = new Set(prev.filter(c => c.isBotGroup).map(c => c.id));
        const newGroupChannels = groupChannels.filter(gc => !existingGroupChannelIds.has(gc.id));
        const nonGroupChannelsCurrent = prev.filter(c => !c.isBotGroup);
        return [...nonGroupChannelsCurrent, ...newGroupChannels];
      });

    } catch (error) {
      console.error("Failed to load user bot groups:", error);
      toast({ title: "Error Loading Groups", description: "Could not fetch your bot group configurations.", variant: "destructive" });
    } finally {
      setIsLoadingBotGroups(false);
    }
  }, [toast]);


  const handleAuthStateChangeLogic = useCallback(async (firebaseUser: FirebaseUser | null) => {
    setIsLoadingAuth(true); 
    if (firebaseUser) {
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      let appUser: User;

      if (userSnap.exists()) {
        const userData = userSnap.data();
        appUser = {
          uid: firebaseUser.uid,
          name: userData?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
          avatarUrl: userData?.avatarUrl || firebaseUser.photoURL,
          email: firebaseUser.email,
          isBot: false,
          statusMessage: userData?.statusMessage || undefined,
          shapesIncApiKey: userData?.shapesIncApiKey || undefined,
          shapesIncUsername: userData?.shapesIncUsername || undefined,
          linkedAccounts: userData?.linkedAccounts || [],
          lastSeen: userData?.lastSeen ? (userData.lastSeen as Timestamp).toMillis() : Date.now(),
        };
        await updateUserLastSeen(firebaseUser.uid); // Update lastSeen on login
      } else {
        const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User';
        appUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: newName,
          avatarUrl: firebaseUser.photoURL,
          isBot: false,
          statusMessage: undefined,
          shapesIncApiKey: undefined,
          shapesIncUsername: undefined,
          linkedAccounts: [],
          lastSeen: Date.now(),
        };
        // Use createUserDocument which includes lastSeen
        await createUserDocument(appUser);
      }
      setCurrentUser(appUser);
      setUsers(prevUsers => { // Update users state
        const otherUsers = prevUsers.filter(u => u.uid !== appUser.uid);
        return [appUser, ...otherUsers];
      });

      const defaultBotDmForUser = staticChannelsData.find(c => c.id === DEFAULT_BOT_CHANNEL_ID && c.type === 'dm');
      if (defaultBotDmForUser) {
        setDirectMessages(prevDms => {
            const existingDefaultDmIndex = prevDms.findIndex(dm => dm.isBotChannel && dm.botId === DEFAULT_AI_BOT_USER_ID);
            const updatedDefaultDm = {...defaultBotDmForUser, members: [appUser.uid, DEFAULT_AI_BOT_USER_ID]};
            if(existingDefaultDmIndex > -1) {
                const newDms = [...prevDms];
                newDms[existingDefaultDmIndex] = updatedDefaultDm;
                return newDms;
            }
            return [...prevDms, updatedDefaultDm];
        });
      }

      await loadUserBots(firebaseUser.uid); 
      await loadUserBotGroups(firebaseUser.uid); 
      await loadAllAppUsers(); // Load other users
      setAuthError(null);
    } else { 
      setCurrentUser(null);
      setUsers(prevUsers => prevUsers.filter(u => u.isBot)); 
      setUserBots([]);
      setAllAppUsers([]);
      
      const defaultGlobalDmForLogout = staticChannelsData.find(c => c.id === DEFAULT_BOT_CHANNEL_ID && c.type === 'dm');
      if (defaultGlobalDmForLogout) {
        setDirectMessages([{...defaultGlobalDmForLogout, members:['placeholderCurrentUser', DEFAULT_AI_BOT_USER_ID]}]);
        setActiveChannelId(defaultGlobalDmForLogout.id);
      } else {
        setDirectMessages([]);
        const aiLoungeChannel = staticChannelsData.find(c => c.id === AI_LOUNGE_CHANNEL_ID);
        setActiveChannelId(aiLoungeChannel?.id || null);
      }
      
      setBotGroups([]); 
      
      const globalChannelIds = new Set([AI_LOUNGE_CHANNEL_ID]); 
      setChannels(staticChannelsData.filter(c => globalChannelIds.has(c.id) && !c.isBotGroup)); 
    }
    setIsLoadingAuth(false); 
  }, [
      loadUserBots, loadUserBotGroups, toast, loadAllAppUsers
  ]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChangeLogic);
    return () => unsubscribe();
  }, [handleAuthStateChangeLogic]); 

  useEffect(() => {
    if (isLoadingAuth || isLoadingUserBots || isLoadingBotGroups || isLoadingPlatformAis || isLoadingAllUsers) {
      return; 
    }

    const channelQuery = searchParams.get('channel');
    const createBotQuery = searchParams.get('createBot');
    const manageGroupQuery = searchParams.get('manageGroup');
    const createGroupQuery = searchParams.get('createGroup');
    const settingsQuery = searchParams.get('settings');

    if (createBotQuery === 'true') {
      setIsCreateBotDialogOpen(true);
      router.replace('/'); 
      return;
    }
    if (manageGroupQuery) {
        const group = botGroups.find(g => g.id === manageGroupQuery && g.ownerUserId === currentUser?.uid);
        if (group) {
            setSelectedGroupToManage(group);
            setIsManageBotGroupDialogOpen(true);
        } else {
            toast({title: "Error", description:"Group not found or invalid permissions.", variant: "destructive"});
        }
        router.replace('/');
        return;
    }
    if (createGroupQuery === 'true') {
        setIsCreateBotGroupDialogOpen(true);
        router.replace('/');
        return;
    }
    if (settingsQuery === 'account') {
        setIsAccountSettingsDialogOpen(true);
        router.replace('/');
        return;
    }


    let newActiveChannelId: string | null = null;

    const allAvailableChannelsAndDMs = [...channels, ...directMessages];

    if (channelQuery && allAvailableChannelsAndDMs.some(c => c.id === channelQuery)) {
      newActiveChannelId = channelQuery;
    } else if (currentUser) {
      const currentActiveIsRelevant = activeChannelId && allAvailableChannelsAndDMs.some(c => c.id === activeChannelId);
      if (!currentActiveIsRelevant || !activeChannelId) { 
        const defaultDm = directMessages.find(c => c.isBotChannel && c.botId === DEFAULT_AI_BOT_USER_ID && c.members?.includes(currentUser.uid));
        const firstUserDm = directMessages.find(c => c.isBotChannel && c.botId !== DEFAULT_AI_BOT_USER_ID && c.members?.includes(currentUser.uid));
        const firstUserToUserDm = directMessages.find(c => c.isUserDm && c.members?.includes(currentUser.uid));
        const firstGroup = channels.find(c => c.isBotGroup && c.members?.includes(currentUser.uid));
        const aiLounge = channels.find(c => c.id === AI_LOUNGE_CHANNEL_ID);

        if (defaultDm) newActiveChannelId = defaultDm.id;
        else if (firstUserToUserDm) newActiveChannelId = firstUserToUserDm.id; // Prioritize user DMs
        else if (firstUserDm) newActiveChannelId = firstUserDm.id;
        else if (firstGroup) newActiveChannelId = firstGroup.id;
        else if (aiLounge) newActiveChannelId = aiLounge.id;
        else if (directMessages.length > 0) newActiveChannelId = directMessages[0].id;
        else if (channels.length > 0) newActiveChannelId = channels[0].id;
      } else {
        newActiveChannelId = activeChannelId; 
      }
    } else { 
      const defaultGlobalDM = directMessages.find(dm => dm.id === DEFAULT_BOT_CHANNEL_ID && dm.botId === DEFAULT_AI_BOT_USER_ID);
      if (defaultGlobalDM) newActiveChannelId = defaultGlobalDM.id;
      else {
          const aiLounge = channels.find(c => c.id === AI_LOUNGE_CHANNEL_ID);
          if (aiLounge) newActiveChannelId = aiLounge.id;
      }
    }
    
    if (newActiveChannelId !== activeChannelId) {
      setActiveChannelId(newActiveChannelId);
    }

  }, [
    currentUser, channels, directMessages, activeChannelId, searchParams, router, botGroups, toast,
    isLoadingAuth, isLoadingUserBots, isLoadingBotGroups, isLoadingPlatformAis, isLoadingAllUsers
  ]);

  useEffect(() => {
    if (messageListenerUnsubscribeRef.current) {
      messageListenerUnsubscribeRef.current();
      messageListenerUnsubscribeRef.current = null;
    }

    if (activeChannelId) {
      setMessages([]); 
      messageListenerUnsubscribeRef.current = subscribeToChannelMessages(
        activeChannelId,
        (fetchedMessages) => {
          setMessages(fetchedMessages);
        }
      );
    } else {
      setMessages([]); 
    }

    return () => {
      if (messageListenerUnsubscribeRef.current) {
        messageListenerUnsubscribeRef.current();
        messageListenerUnsubscribeRef.current = null;
      }
    };
  }, [activeChannelId]);


  const handleFirebaseAuthError = (error: any, actionType: "Login" | "Sign Up" | "Link Account") => {
    console.error(`${actionType} error:`, error);
    let description = `An unknown error occurred during ${actionType.toLowerCase()}.`;
    let title = `${actionType} Failed`;

    switch (error.code) {
      case 'auth/unauthorized-domain':
        description = "This domain is not authorized. Add it to Firebase Console > Authentication > Settings > Authorized domains (e.g., localhost).";
        break;
      case 'auth/invalid-api-key':
        description = "Invalid Firebase API Key. Check your NEXT_PUBLIC_FIREBASE_API_KEY env var.";
        break;
      case 'auth/invalid-email': description = "The email address is not valid."; break;
      case 'auth/user-disabled': description = "This user account has been disabled."; break;
      case 'auth/user-not-found': description = "No user found with this email. Sign up or check email."; break;
      case 'auth/wrong-password': description = "Incorrect password."; break;
      case 'auth/email-already-in-use': description = "This email is already in use."; break;
      case 'auth/weak-password': description = "Password is too weak (min 6 characters)."; break;
      case 'auth/operation-not-allowed': description = "Email/password accounts not enabled in Firebase Console."; break;
      case 'auth/credential-already-in-use': description = "This credential is already associated with a different user account."; title = "Linking Failed"; break;
      case 'auth/provider-already-linked': description = "This account is already linked."; title = "Linking Info"; break;
      default: if (error.message) { description = error.message; }
    }
    setAuthError(description);
    toast({ title, description, variant: "destructive", duration: 7000 });
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, USERS_COLLECTION, user.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        await createUserDocument({
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Anonymous User',
          avatarUrl: user.photoURL || null,
          isBot:false,
          linkedAccounts: [{ providerId: GoogleAuthProvider.PROVIDER_ID, email: user.email, displayName: user.displayName }],
          lastSeen: Date.now(), // set lastSeen on creation
        });
      } else {
         await updateDoc(userDocRef, { 
            name: user.displayName || userSnap.data()?.name,
            avatarUrl: user.photoURL || userSnap.data()?.avatarUrl,
            linkedAccounts: arrayUnion({ providerId: GoogleAuthProvider.PROVIDER_ID, email: user.email, displayName: user.displayName }),
            lastSeen: serverTimestamp(), // update lastSeen
        });
      }
      toast({ title: "Logged In Successfully!", description: `Welcome back, ${user.displayName || user.email}!` });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Login");
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const handleEmailPasswordSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await updateUserLastSeen(userCredential.user.uid);
      toast({ title: "Logged In Successfully!" });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Login");
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const handleEmailPasswordSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setAuthError("Please enter both email and password to sign up.");
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newName = email.split('@')[0];
      await updateProfile(userCredential.user, { displayName: newName });
      await createUserDocument({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: newName,
        avatarUrl: null,
        isBot:false,
        linkedAccounts: [{ providerId: 'password', email: userCredential.user.email }],
        lastSeen: Date.now(), // set lastSeen on creation
      });
      toast({ title: "Signed Up Successfully!", description: "Welcome to ShapeTalk!" });
    } catch (error: any) {
      handleFirebaseAuthError(error, "Sign Up");
    } finally {
        setIsLoadingAuth(false);
    }
  };
  const handleLogout = async () => {
    try {
      if(currentUser) await updateUserProfileInFirestore(currentUser.uid, { lastSeen: Date.now() }); // Update last seen before logging out
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (currentUser && activeChannelId) {
      const currentChannel = [...channels, ...directMessages].find(c => c.id === activeChannelId);
      const messagesExistForChannel = messages.some(msg => msg.channelId === activeChannelId);

      if (currentChannel?.isBotChannel && currentChannel.botId && !hasSentInitialBotMessageForChannel[activeChannelId] && !messagesExistForChannel) {
          let greeting = "Hello! How can I help you today?";
          if (currentChannel.botId === DEFAULT_AI_BOT_USER_ID) {
            if (isApiHealthy === null) greeting = "Checking my connection...";
            else if (isApiHealthy) greeting = "Hello! I'm the default Shape AI, powered by Shapes.inc. How can I help?";
            else greeting = "I'm the default Shape AI, but my services seem to be unavailable right now.";
          } else {
            const botConfig = userBots.find(b => b.id === currentChannel.botId) || platformAndPublicAis.find(p => p.id === currentChannel.botId);
            if (botConfig && (botConfig as BotConfig).greetingMessage) {
              greeting = (botConfig as BotConfig).greetingMessage!;
            }
          }
          sendBotMessageUtil(activeChannelId, currentChannel.botId, greeting);
          setHasSentInitialBotMessageForChannel(prev => ({ ...prev, [activeChannelId]: true }));
      } else if (currentChannel?.isUserDm && !hasSentInitialBotMessageForChannel[activeChannelId] && !messagesExistForChannel){
        // For user DMs, no initial bot message, but mark as "interacted"
        setHasSentInitialBotMessageForChannel(prev => ({ ...prev, [activeChannelId]: true }));
      }
    }
  }, [currentUser, activeChannelId, channels, directMessages, userBots, platformAndPublicAis, isApiHealthy, messages, sendBotMessageUtil, hasSentInitialBotMessageForChannel]);

  const handleSelectChannel = (channelId: string) => {
    // setHasSentInitialBotMessageForChannel(prev => ({ ...prev, [channelId]: false })); // Reset might not be needed or desired for initial greeting
    setActiveChannelId(channelId);
    if (currentUser) updateUserLastSeen(currentUser.uid);
  };

  const handleSelectUserForDm = async (targetUser: User) => {
    if (!currentUser || !targetUser || currentUser.uid === targetUser.uid) return;
    
    try {
      const dmChannel = await getOrCreateDmChannelBetweenUsers(currentUser.uid, targetUser.uid, targetUser.name || 'User');
      // Check if this DM channel already exists in local state to prevent duplicates
      if (!directMessages.find(dm => dm.id === dmChannel.id)) {
        setDirectMessages(prevDms => [...prevDms, dmChannel]);
      }
       // Ensure the target user is in the `users` state for avatar/name display
      if (!users.find(u => u.uid === targetUser.uid)) {
        setUsers(prev => [...prev, targetUser]);
      }
      setActiveChannelId(dmChannel.id);
      if (currentUser) updateUserLastSeen(currentUser.uid);

    } catch (error) {
      console.error("Error creating/getting DM channel:", error);
      toast({ title: "DM Error", description: "Could not start a chat with this user.", variant: "destructive" });
    }
  };


  const handleSendMessage = async (channelId: string, content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => {
    if (!currentUser || !channelId) { 
        toast({title: "Error", description: "Cannot send message. User or channel not available.", variant: "destructive"});
        return;
    }
    await updateUserLastSeen(currentUser.uid);

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      channelId,
      userId: currentUser.uid,
      content,
      timestamp: Date.now(),
    };
    await saveMessageToFirestore(newMessage);


    await removeTypingIndicatorFromFirestore(channelId, currentUser.uid);
    setTypingUsers(prev => prev.filter(tu => !(tu.channelId === channelId && tu.userId === currentUser.uid)));

    const allChannels = [...channels, ...directMessages]; 
    const currentChannel = allChannels.find(c => c.id === channelId);

    if (currentChannel && currentChannel.isBotChannel && content.type === 'text') {
      let botUserIdToUse = DEFAULT_AI_BOT_USER_ID;
      let botApiKeyToUse: string | undefined = undefined;
      let botShapeUsernameToUse: string | undefined = undefined;
      let botSystemPrompt: string | undefined = undefined;
      
      const foundBotConfig = userBots.find(b => b.id === currentChannel.botId) || 
                             platformAndPublicAis.find(p => p.id === currentChannel.botId && p.isUserCreated) as (PlatformShape & { apiKey?: string }); 

      if (currentChannel.botId && currentChannel.botId !== DEFAULT_AI_BOT_USER_ID) {
          const actualBotConfig = userBots.find(b => b.id === currentChannel.botId) || await getBotConfigFromFirestore(currentChannel.botId);
        if (actualBotConfig) { 
          botUserIdToUse = actualBotConfig.id;
          if (actualBotConfig.apiKey && actualBotConfig.apiKey !== '***') {
            botApiKeyToUse = actualBotConfig.apiKey; 
          }
          botShapeUsernameToUse = actualBotConfig.shapeUsername;
          botSystemPrompt = actualBotConfig.systemPrompt;
        } else if (foundBotConfig && foundBotConfig.shapeUsername) { 
            botUserIdToUse = foundBotConfig.id;
            botShapeUsernameToUse = foundBotConfig.shapeUsername;
            botSystemPrompt = (foundBotConfig as BotConfig).systemPrompt || foundBotConfig.description; 
        }
         else {
          sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "Sorry, I couldn't find the complete configuration for this bot.", "text");
          return;
        }
      } else { 
        if (isApiHealthy === false) { 
            sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "I'm having trouble connecting to my services right now. Please try again later.", "text");
            return;
        }
         if (isApiHealthy === null) { 
            sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "I'm still checking my connection. Please wait a moment.", "text");
            return;
        }
        if (currentUser.shapesIncApiKey && currentUser.shapesIncUsername) {
            botApiKeyToUse = currentUser.shapesIncApiKey;
            botShapeUsernameToUse = currentUser.shapesIncUsername;
        } 
      }

      try {
        const contextShapeForBot = PREDEFINED_SHAPES[0];
        if (!contextShapeForBot) { 
            sendBotMessageUtil(channelId, botUserIdToUse, "Sorry, I'm missing some core context to operate.", "text");
            return;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          contextShapeId: contextShapeForBot.id,
          userId: currentUser.uid,
          channelId: channelId,
          botApiKey: botApiKeyToUse, 
          botShapeUsername: botShapeUsernameToUse, 
          systemPrompt: botSystemPrompt,
        });

        await sendBotMessageUtil(channelId, botUserIdToUse, aiResponse.responseText, "ai_response", content.text, contextShapeForBot.id);

      } catch (error) {
        console.error("Error calling Shapes API:", error);
        await sendBotMessageUtil(channelId, botUserIdToUse, `Sorry, I encountered an error: ${(error as Error).message}`, "text");
      }
    } else if (currentChannel && currentChannel.isAiLounge && content.type === 'text') {
      if (isApiHealthy === false || isApiHealthy === null || platformAndPublicAis.length === 0) {
        let loungeMessage = "The AI Lounge is quiet...";
        if (isApiHealthy === false) loungeMessage = "The AI Lounge is quiet, core services seem unavailable.";
        else if (isApiHealthy === null) loungeMessage = "Checking AI Lounge connections...";
        else if (platformAndPublicAis.length === 0) loungeMessage = "No AIs seem to be in the lounge right now.";
        await sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, loungeMessage, "text");
        return;
      }
      
      const randomPlatformAi = platformAndPublicAis[Math.floor(Math.random() * platformAndPublicAis.length)];
      try {
        const contextShapeForLounge = PREDEFINED_SHAPES[0]; 
        if (!contextShapeForLounge) { 
             await sendBotMessageUtil(channelId, randomPlatformAi.id, "Missing context for the lounge chat.", "text");
            return;
        }
        
        let apiKeyForLounge = undefined;
        const userBotMatch = userBots.find(ub => ub.id === randomPlatformAi.id && ub.isPublic);
        if (userBotMatch && userBotMatch.apiKey && userBotMatch.apiKey !== '***') {
            apiKeyForLounge = userBotMatch.apiKey;
        }

        const aiResponse = await chatWithShape({
          promptText: content.text,
          contextShapeId: contextShapeForLounge.id,
          userId: currentUser.uid,
          channelId: channelId,
          botShapeUsername: randomPlatformAi.shapeUsername, 
          botApiKey: apiKeyForLounge,
          systemPrompt: randomPlatformAi.description, 
        });
        await sendBotMessageUtil(channelId, randomPlatformAi.id, aiResponse.responseText, "ai_response", content.text, contextShapeForLounge.id);
      } catch (error) {
         console.error("Error in AI Lounge chat:", error);
         await sendBotMessageUtil(channelId, randomPlatformAi.id, `An error occurred in the lounge: ${(error as Error).message}`, "text");
      }
    } else if (currentChannel && currentChannel.isBotGroup && currentChannel.groupId && content.type === 'text') {
        if (isApiHealthy === false || isApiHealthy === null) {
            const healthMessage = isApiHealthy === false ? "Group chat unavailable, core services seem down." : "Checking group chat connections...";
            await sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, healthMessage, "text");
            return;
        }

        const groupConfig = botGroups.find(g => g.id === currentChannel.groupId) || await getBotGroupFS(currentChannel.groupId);

        if (!groupConfig || !groupConfig.botIds || groupConfig.botIds.length === 0) {
            await sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, "This group doesn't have any bots to respond.", "text");
            return;
        }
        
        for (const respondingBotId of groupConfig.botIds) {
            let botToRespond: BotConfig | PlatformShape | null = null;
            let botApiKeyToUse: string | undefined = undefined;
            let botShapeUsernameToUse: string | undefined = undefined;
            let botSystemPrompt: string | undefined = undefined;

            botToRespond = userBots.find(b => b.id === respondingBotId) as BotConfig | null;
            if (!botToRespond) {
                botToRespond = platformAndPublicAis.find(p => p.id === respondingBotId) as PlatformShape | null;
            }
            if (!botToRespond) { 
                botToRespond = await getBotConfigFromFirestore(respondingBotId);
            }

            if (!botToRespond) {
                await sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, `Configuration for bot ${respondingBotId} in group not found. Skipping.`, "text");
                continue; 
            }

            botShapeUsernameToUse = botToRespond.shapeUsername;
            if ('apiKey' in botToRespond && botToRespond.apiKey && botToRespond.apiKey !== '***') {
                botApiKeyToUse = botToRespond.apiKey;
            }
            if ('systemPrompt' in botToRespond && botToRespond.systemPrompt) {
                botSystemPrompt = botToRespond.systemPrompt;
            } else if ('description' in botToRespond) { 
                botSystemPrompt = botToRespond.description;
            }
            
            if (!botShapeUsernameToUse) {
                await sendBotMessageUtil(channelId, DEFAULT_AI_BOT_USER_ID, `Shape username for ${botToRespond.name} is missing. Skipping.`, "text");
                continue; 
            }

            try {
                const contextShapeForGroup = PREDEFINED_SHAPES[0]; 
                if (!contextShapeForGroup) {
                    await sendBotMessageUtil(channelId, respondingBotId, "Missing core context for group chat. Skipping.", "text");
                    continue;
                }
                const aiResponse = await chatWithShape({
                    promptText: content.text,
                    contextShapeId: contextShapeForGroup.id,
                    userId: currentUser.uid, 
                    channelId: channelId,     
                    botApiKey: botApiKeyToUse,
                    botShapeUsername: botShapeUsernameToUse,
                    systemPrompt: botSystemPrompt || `You are ${botToRespond.name} in the group "${groupConfig.name}".`,
                });
                await sendBotMessageUtil(channelId, respondingBotId, aiResponse.responseText, "ai_response", content.text, contextShapeForGroup.id);
            } catch (error) {
                console.error(`Error calling Shapes API for bot ${respondingBotId} in group ${groupConfig.name}:`, error);
                await sendBotMessageUtil(channelId, respondingBotId, `Sorry, I encountered an error: ${(error as Error).message}`, "text");
            }
        } 
    }
    // No specific handling for user-to-user DMs here for AI response, as it's direct chat.
  };

  const handleSendAiResponseMessage = async (
    channelId: string,
    responseData: { textResponse: string; prompt: string; sourceShapeId: string }
  ) => {
    if (!currentUser || !channelId) {
      toast({ title: "Error", description: "Cannot send AI response: Missing user or channel context.", variant: "destructive"});
      return;
    }
    await updateUserLastSeen(currentUser.uid);
    const activeCh = [...channels, ...directMessages].find(c => c.id === channelId);
    const botIdToUse = activeCh?.isBotChannel && activeCh.botId ? activeCh.botId : DEFAULT_AI_BOT_USER_ID;

    await sendBotMessageUtil(
      channelId,
      botIdToUse,
      responseData.textResponse,
      "ai_response",
      responseData.prompt,
      responseData.sourceShapeId
    );
  };

  const handleOpenAccountSettings = () => setIsAccountSettingsDialogOpen(true);
  
  const handleOpenBotSettings = (botId: string) => {
    const botToEdit = userBots.find(bot => bot.id === botId);
    if (botToEdit && botToEdit.ownerUserId === currentUser?.uid) {
      setSelectedBotToEdit(botToEdit);
      setIsBotSettingsDialogOpen(true);
    } else {
      toast({ title: "Permission Denied", description: "You can only edit your own bots.", variant: "destructive" });
    }
  };
  
  const handleDeleteBot = async (botId: string) => {
    if (!currentUser) return;
    const botToDelete = userBots.find(bot => bot.id === botId);
    if (!botToDelete || botToDelete.ownerUserId !== currentUser.uid) {
      toast({ title: "Permission Denied", description: "You can only delete your own bots.", variant: "destructive" });
      return;
    }
    try {
      await deleteUserBotConfigFromFirestore(botId);
      setUserBots(prev => prev.filter(b => b.id !== botId));
      setDirectMessages(prev => prev.filter(dm => dm.botId !== botId || dm.id !== `dm_${botId}_${currentUser.uid}`));
      setUsers(prev => prev.filter(u => u.uid !== botId));
      if (activeChannelId === `dm_${botId}_${currentUser.uid}`) {
        const globalDefaultDM = directMessages.find(dm => dm.isBotChannel && dm.botId === DEFAULT_AI_BOT_USER_ID);
        setActiveChannelId(globalDefaultDM?.id || channels.find(c => c.id === AI_LOUNGE_CHANNEL_ID)?.id || null); 
      }
      toast({ title: "Bot Deleted", description: `${botToDelete.name} has been deleted.` });
      loadPlatformAndPublicAis(); 
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleAccountUpdate = async (updatedUserData: Partial<User>) => { 
    if (!currentUser) return;
    const newCurrentUser = { ...currentUser, ...updatedUserData };
    setCurrentUser(newCurrentUser);
    setUsers(prevUsers => prevUsers.map(u => u.uid === newCurrentUser.uid ? newCurrentUser : u));
    if(updatedUserData.lastSeen) await updateUserLastSeen(currentUser.uid);
  };

  const handleAddChannel = () => { 
    toast({ title: "Info", description: "Channel creation is managed via DMs, Groups, or global channels.", variant: "info" });
  };

  const handleBotCreatedOrUpdated = (botConfig: BotConfig) => {
    const wasJustCreated = !userBots.find(b => b.id === botConfig.id);
    setUserBots(prev => {
      const index = prev.findIndex(b => b.id === botConfig.id);
      if (index > -1) {
        const updatedBots = [...prev];
        updatedBots[index] = botConfig;
        return updatedBots;
      }
      return [...prev, botConfig];
    });

    const botUser: User = {
      uid: botConfig.id,
      name: botConfig.name,
      avatarUrl: botConfig.avatarUrl || `https://picsum.photos/seed/${botConfig.id}/40/40`,
      dataAiHint: 'bot avatar',
      isBot: true,
    };
    setUsers(prev => {
        const existingIndex = prev.findIndex(u => u.uid === botUser.uid);
        if (existingIndex > -1) {
            const updatedUsers = [...prev];
            updatedUsers[existingIndex] = botUser;
            return updatedUsers;
        }
        return [...prev, botUser];
    });

    if (currentUser) {
      const dmId = `dm_${botConfig.id}_${currentUser.uid}`;
      setDirectMessages(prevDms => {
        const existingDmIndex = prevDms.findIndex(dm => dm.id === dmId);
        const newDmChannel: Channel = {
          id: dmId,
          name: botConfig.name,
          type: 'dm',
          members: [currentUser.uid, botConfig.id],
          isBotChannel: true,
          botId: botConfig.id,
          icon: Bot,
        };
        if (existingDmIndex > -1) {
          const updatedDms = [...prevDms];
          updatedDms[existingDmIndex] = newDmChannel;
          return updatedDms;
        }
        return [...prevDms, newDmChannel];
      });
      if (wasJustCreated) {
         setActiveChannelId(dmId);
      }
    }
    if (botConfig.isPublic || userBots.find(b => b.id === botConfig.id)?.isPublic !== botConfig.isPublic) {
        loadPlatformAndPublicAis();
    }
  };
  
  const handleOpenCreateBotGroupDialog = () => setIsCreateBotGroupDialogOpen(true);

  const handleBotGroupCreated = async (groupData: Omit<BotGroup, 'id' | 'ownerUserId'>) => {
    if (!currentUser) return;
    setIsUpdatingGroup(true);
    try {
      const newGroup = await createBotGroupInFirestore({ ...groupData, ownerUserId: currentUser.uid, botIds: [], memberUserIds: [currentUser.uid] });
      setBotGroups(prev => [...prev, newGroup]);
      const groupChannel: Channel = {
        id: `group_${newGroup.id}`,
        name: newGroup.name,
        type: 'group',
        icon: BotGroupsIcon,
        isBotGroup: true,
        groupId: newGroup.id,
        members: [newGroup.ownerUserId], 
      };
      setChannels(prev => [...prev, groupChannel]);
      setActiveChannelId(groupChannel.id);
      toast({ title: "Group Created", description: `Group "${newGroup.name}" is ready.` });
    } catch (error) {
      console.error("Error creating bot group:", error);
      toast({ title: "Group Creation Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleOpenManageBotGroupDialog = (groupId: string) => {
    if (!currentUser) return;
    const group = botGroups.find(g => g.id === groupId && g.ownerUserId === currentUser.uid);
    if (group) {
      setSelectedGroupToManage(group);
      setIsManageBotGroupDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Group not found or you don't have permission.", variant: "destructive" });
    }
  };

  const handleBotGroupUpdated = async (updatedGroupData: Omit<BotGroup, 'id' | 'ownerUserId' | 'memberUserIds'> & {id: string} ) => {
    if (!currentUser || !selectedGroupToManage || selectedGroupToManage.ownerUserId !== currentUser.uid) {
      toast({ title: "Error", description: "Cannot update group.", variant: "destructive" });
      return;
    }
    setIsUpdatingGroup(true);
    try {
      await updateBotGroupInFirestore(selectedGroupToManage.id, {
        name: updatedGroupData.name,
        description: updatedGroupData.description,
        avatarUrl: updatedGroupData.avatarUrl,
        botIds: updatedGroupData.botIds, 
      });
      const fullyUpdatedGroup = { ...selectedGroupToManage, ...updatedGroupData };

      setBotGroups(prev => prev.map(g => g.id === fullyUpdatedGroup.id ? fullyUpdatedGroup : g));
      setChannels(prev => prev.map(c => {
        if (c.isBotGroup && c.groupId === fullyUpdatedGroup.id) {
          return { ...c, name: fullyUpdatedGroup.name, members: [fullyUpdatedGroup.ownerUserId, ...(fullyUpdatedGroup.botIds || [])] };
        }
        return c;
      }));
      toast({ title: "Group Updated", description: `Group "${fullyUpdatedGroup.name}" has been updated.` });
      setSelectedGroupToManage(fullyUpdatedGroup); 
    } catch (error) {
      console.error("Error updating bot group:", error);
      toast({ title: "Group Update Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleBotGroupDeleted = async (groupId: string) => {
    if (!currentUser || !botGroups.find(g => g.id === groupId && g.ownerUserId === currentUser.uid)) {
      toast({ title: "Error", description: "Cannot delete group.", variant: "destructive" });
      return;
    }
    setIsUpdatingGroup(true);
    try {
      await deleteBotGroupFS(groupId);
      setBotGroups(prev => prev.filter(g => g.id !== groupId));
      setChannels(prev => prev.filter(c => !(c.isBotGroup && c.groupId === groupId) ));
      if (activeChannelId === `group_${groupId}`) {
        const globalDefaultDM = directMessages.find(dm => dm.isBotChannel && dm.botId === DEFAULT_AI_BOT_USER_ID);
        setActiveChannelId(globalDefaultDM?.id || channels.find(c => c.id === AI_LOUNGE_CHANNEL_ID)?.id || null); 
      }
      toast({ title: "Group Deleted", description: "The bot group has been deleted." });
      setIsManageBotGroupDialogOpen(false);
    } catch (error) {
      console.error("Error deleting bot group:", error);
      toast({ title: "Group Deletion Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleAddBotToGroup = async (groupId: string, botId: string) => {
    if (!currentUser || !botGroups.find(g => g.id === groupId && g.ownerUserId === currentUser.uid)) return;
    setIsUpdatingGroup(true);
    try {
        await addBotToGroupInFirestore(groupId, botId);
        const updatedGroup = await getBotGroupFS(groupId); 
        if (updatedGroup) {
            setBotGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
            setSelectedGroupToManage(updatedGroup); 
             setChannels(prev => prev.map(c => {
                if (c.isBotGroup && c.groupId === updatedGroup.id) {
                return { ...c, members: [updatedGroup.ownerUserId, ...(updatedGroup.botIds || [])] };
                }
                return c;
            }));
        }
        toast({title: "Bot Added", description: "Bot added to group."});
    } catch (error) {
        toast({title: "Error", description: `Failed to add bot: ${(error as Error).message}`, variant: "destructive"});
    } finally {
        setIsUpdatingGroup(false);
    }
  };

 const handleRemoveBotFromGroup = async (groupId: string, botId: string) => {
    if (!currentUser || !botGroups.find(g => g.id === groupId && g.ownerUserId === currentUser.uid)) return;
    setIsUpdatingGroup(true);
    try {
        await removeBotFromGroupInFirestore(groupId, botId);
        const updatedGroup = await getBotGroupFS(groupId); 
        if (updatedGroup) {
            setBotGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
            setSelectedGroupToManage(updatedGroup);
             setChannels(prev => prev.map(c => {
                if (c.isBotGroup && c.groupId === updatedGroup.id) {
                return { ...c, members: [updatedGroup.ownerUserId, ...(updatedGroup.botIds || [])] };
                }
                return c;
            }));
        }
        toast({title: "Bot Removed", description: "Bot removed from group."});
    } catch (error) {
        toast({title: "Error", description: `Failed to remove bot: ${(error as Error).message}`, variant: "destructive"});
    } finally {
        setIsUpdatingGroup(false);
    }
 };

  const handleUserTyping = useCallback(async (isTyping: boolean) => {
    if (!currentUser || !activeChannelId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping) {
      await setTypingIndicatorInFirestore({
        userId: currentUser.uid,
        userName: currentUser.name || 'Someone',
        channelId: activeChannelId,
        timestamp: Date.now() 
      });
      typingTimeoutRef.current = setTimeout(async () => {
        await removeTypingIndicatorFromFirestore(activeChannelId, currentUser.uid);
      }, TYPING_INDICATOR_TIMEOUT);

    } else {
      await removeTypingIndicatorFromFirestore(activeChannelId, currentUser.uid);
    }
  }, [currentUser, activeChannelId]);

  useEffect(() => {
    if (!activeChannelId || !currentUser) {
      setTypingUsers([]); 
      return;
    }

    const q = query(
      collection(db, TYPING_INDICATORS_COLLECTION), 
      where('channelId', '==', activeChannelId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const indicators: TypingIndicator[] = [];
      const batch = writeBatch(db);
      let needsBatchCommit = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<TypingIndicator, 'timestamp'> & { timestamp: Timestamp }; 
        const indicator: TypingIndicator = {
          userId: data.userId,
          userName: data.userName,
          channelId: data.channelId,
          timestamp: data.timestamp.toMillis() 
        };

        if (indicator.userId !== currentUser.uid && (now - indicator.timestamp) < TYPING_INDICATOR_TIMEOUT) {
          indicators.push(indicator);
        } else if ((now - indicator.timestamp) >= TYPING_INDICATOR_TIMEOUT) {
          batch.delete(docSnap.ref);
          needsBatchCommit = true;
        }
      });

      if (needsBatchCommit) {
        batch.commit().catch(err => console.error("Error batch deleting stale typing indicators:", err));
      }
      setTypingUsers(indicators);
    });

    return () => unsubscribe();
  }, [activeChannelId, currentUser]);

  const channelsForMainSidebar = channels.filter(c => c.isAiLounge || c.isBotGroup); 
  const botGroupsForMainSidebar = botGroups; 
  const directMessagesForMainSidebar = directMessages;
  
  const activeChannelDetails = activeChannelId ? [...channels, ...directMessages].find(c => c.id === activeChannelId) : null;


  if (isLoadingAuth && !currentUser) { 
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mr-4" />
        <p>Loading ShapeTalk...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="p-8 max-w-sm w-full bg-card shadow-xl rounded-lg border border-border">
          <div className="flex justify-center mb-6">
            <ShapeTalkLogo className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-1">Welcome to ShapeTalk</h2>
          <p className="text-center text-muted-foreground mb-6">Chat with shapes, powered by AI.</p>
          
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4 mb-4">
            <div>
              <Label htmlFor="email-signin">Email</Label>
              <Input id="email-signin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-input"/>
            </div>
            <div>
              <Label htmlFor="password-signin">Password</Label>
              <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-input"/>
            </div>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1" disabled={isLoadingAuth}>
                  {isLoadingAuth ? <Loader2 className="animate-spin" /> : <LogIn />} Sign In
                </Button>
                 <Button type="button" variant="outline" onClick={handleEmailPasswordSignUp} className="flex-1" disabled={isLoadingAuth}>
                  {isLoadingAuth ? <Loader2 className="animate-spin" /> : <UserPlus />} Sign Up
                </Button>
            </div>
          </form>
          <Separator className="my-6" />
          <Button onClick={handleGoogleLogin} variant="outline" className="w-full" disabled={isLoadingAuth}>
            {isLoadingAuth ? <Loader2 className="animate-spin" /> : <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>} Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
      <div className="w-16 bg-sidebar-background border-r border-sidebar-border flex flex-col items-center py-3 space-y-3 overflow-y-auto no-scrollbar shrink-0">
         <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant={"secondary"} 
                        size="icon" 
                        className="h-12 w-12 rounded-full"
                        onClick={() => router.push('/')}
                        aria-label="Direct Messages & Home"
                    >
                        <ShapeTalkLogo className="h-7 w-7 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Direct Messages</TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={router.pathname === '/discover-shapes' ? "secondary" : "ghost"}
                        size="icon"
                        className="h-12 w-12 rounded-full text-sidebar-foreground hover:text-primary"
                        aria-label="Discover Shapes"
                        onClick={() => router.push('/discover-shapes')} 
                    >
                        <Compass />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Discover Shapes</TooltipContent>
            </Tooltip>
         </TooltipProvider>
        </div>
      
      <SidebarProvider defaultOpen={true}>
         {currentUser ? (
            <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-sidebar-border">
                <MainChannelSidebarContent
                    channels={channelsForMainSidebar}
                    directMessages={directMessagesForMainSidebar}
                    allAppUsers={allAppUsers}
                    botGroups={botGroupsForMainSidebar}
                    currentUser={currentUser}
                    userBots={userBots}
                    platformAis={platformAndPublicAis}
                    activeChannelId={activeChannelId}
                    serverName={"ShapeTalk"} 
                    onSelectChannel={handleSelectChannel}
                    onSelectUserForDm={handleSelectUserForDm}
                    onOpenAccountSettings={handleOpenAccountSettings}
                    onAddChannel={() => handleAddChannel()} 
                    onOpenCreateBotDialog={() => setIsCreateBotDialogOpen(true)}
                    onOpenCreateBotGroupDialog={handleOpenCreateBotGroupDialog}
                    onOpenManageBotGroupDialog={handleOpenManageBotGroupDialog}
                    onLogout={handleLogout}
                    isLoadingUserBots={isLoadingUserBots || isLoadingBotGroups}
                    isLoadingAllUsers={isLoadingAllUsers}
                />
            </Sidebar>
         ) : (
            <div className="w-0 md:w-64 bg-sidebar-background border-r border-sidebar-border p-4 text-center text-sidebar-foreground shrink-0"></div>
         )}

        <SidebarInset className="flex flex-col flex-1 min-w-0 h-full max-h-screen relative m-0 rounded-none shadow-none p-0">
          { (isLoadingAuth || isLoadingUserBots || isLoadingBotGroups || isLoadingPlatformAis || isLoadingAllUsers) && !activeChannelDetails && currentUser && (
            <div className="flex-1 flex items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          { !((isLoadingAuth || isLoadingUserBots || isLoadingBotGroups || isLoadingPlatformAis || isLoadingAllUsers) && !activeChannelDetails && currentUser) && (
            <>
            <div className="md:hidden p-2 border-b border-border sticky top-0 bg-background z-20">
              <MobileSidebarTrigger className="h-8 w-8">
                  <PanelLeft />
              </MobileSidebarTrigger>
            </div>
            <ChatView
              activeChannel={activeChannelDetails}
              messages={messages.filter(msg => msg.channelId === activeChannelId)}
              currentUser={currentUser}
              users={users} // Pass the comprehensive users list
              userBots={userBots}
              onSendMessage={handleSendMessage}
              onSendAiResponseMessage={handleSendAiResponseMessage}
              onOpenBotSettings={handleOpenBotSettings}
              onDeleteBot={handleDeleteBot}
              onOpenManageGroupDialog={currentUser && activeChannelDetails?.isBotGroup && activeChannelDetails?.groupId ? handleOpenManageBotGroupDialog : undefined}
              onUserTyping={handleUserTyping}
              typingUsers={typingUsers.filter(tu => tu.channelId === activeChannelId && tu.userId !== currentUser?.uid)}
            />
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
      
      {currentUser && (
        <>
          <CreateBotDialog
            isOpen={isCreateBotDialogOpen}
            onOpenChange={setIsCreateBotDialogOpen}
            onBotCreated={handleBotCreatedOrUpdated}
            currentUserId={currentUser.uid}
          />
          {selectedBotToEdit && (
            <BotSettingsDialog
              isOpen={isBotSettingsDialogOpen}
              onOpenChange={setIsBotSettingsDialogOpen}
              botConfig={selectedBotToEdit}
              onBotConfigUpdated={handleBotCreatedOrUpdated}
            />
          )}
          <AccountSettingsDialog
            isOpen={isAccountSettingsDialogOpen}
            onOpenChange={setIsAccountSettingsDialogOpen}
            currentUser={currentUser}
            onAccountUpdate={handleAccountUpdate}
            onAuthError={handleFirebaseAuthError}
          />
          <CreateBotGroupDialog
            isOpen={isCreateBotGroupDialogOpen}
            onOpenChange={setIsCreateBotGroupDialogOpen}
            onBotGroupCreated={handleBotGroupCreated}
            currentUserId={currentUser.uid}
          />
          {selectedGroupToManage && (
            <ManageBotGroupDialog
              isOpen={isManageBotGroupDialogOpen}
              onOpenChange={setIsManageBotGroupDialogOpen}
              groupConfig={selectedGroupToManage}
              userBots={userBots.filter(bot => bot.ownerUserId === currentUser.uid)}
              platformAndPublicAis={platformAndPublicAis}
              onBotGroupUpdated={handleBotGroupUpdated}
              onBotGroupDeleted={handleBotGroupDeleted}
              onAddBotToGroup={handleAddBotToGroup}
              onRemoveBotFromGroup={handleRemoveBotFromGroup}
            />
          )}
        </>
      )}
    </div>
  );
}

    
