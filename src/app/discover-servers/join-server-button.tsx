
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { addUserToServerViaInvite, getServersForUserFromFirestore } from '@/lib/firestoreService';
import { useRouter } from 'next/navigation';
import type { Server } from '@/types';

interface JoinServerButtonProps {
  serverId: string;
  inviteCode: string;
}

export function JoinServerButton({ serverId, inviteCode }: JoinServerButtonProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userServers = await getServersForUserFromFirestore(user.uid);
          setIsMember(userServers.some(s => s.id === serverId));
        } catch (error) {
          console.error("Error checking server membership:", error);
        }
      } else {
        setIsMember(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [serverId]);

  const handleJoinServer = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a server.",
        variant: "destructive",
      });
      router.push('/'); // Redirect to login/main page
      return;
    }
    setIsLoading(true);
    try {
      const result = await addUserToServerViaInvite(currentUser.uid, inviteCode);
      if (result.success) {
        toast({
          title: "Joined Server!",
          description: result.message,
        });
        setIsMember(true);
        // Optionally, navigate to the server or refresh data
        router.push(`/?server=${result.serverId}`); // Navigate to the server
      } else {
        toast({
          title: "Failed to Join",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining server:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while trying to join the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Button disabled size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  if (isMember) {
    return <Button variant="outline" size="sm" disabled><CheckCircle className="mr-2 h-4 w-4 text-green-500" />Joined</Button>;
  }

  return (
    <Button onClick={handleJoinServer} size="sm" variant="default" disabled={!currentUser || isLoading}>
      <UserPlus className="mr-2 h-4 w-4" /> Join Server
    </Button>
  );
}
