
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { chatWithShape } from '@/ai/flows/chat-with-shape-flow';
import { PREDEFINED_SHAPES, getShapeById } from '@/lib/shapes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input'; // Input is not used here, but Textarea is.
import { Textarea } from '@/components/ui/textarea';
import { ShapePalette } from '@/components/shape/shape-palette';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Sparkles } from 'lucide-react';

// This dialog is for "Chat with AI about a specific PREDEFINED_SHAPE"
// It will use the active bot (either default or user-created if in DM)
// The `contextShapeId` here is the shape being discussed.

const formSchema = z.object({
  promptText: z.string().min(1, 'Prompt is required.'),
  contextShapeId: z.string().min(1, 'Please select a shape to discuss.'), // Renamed from shapeId
});

type AiChatFormValues = z.infer<typeof formSchema>;

interface AiChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAiResponse: (responseData: { textResponse: string; prompt: string; sourceShapeId: string }) => void;
  currentUserId?: string; 
  activeChannelId: string | null; 
  // For user-created bots, these would be passed if the dialog needs to target a specific bot
  // However, for this dialog, it uses the bot associated with activeChannelId (handled in page.tsx)
  // botApiKey?: string; 
  // botShapeUsername?: string;
}

export function AiChatDialog({ 
  isOpen, 
  onOpenChange, 
  onAiResponse,
  currentUserId,
  activeChannelId,
}: AiChatDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AiChatFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promptText: '',
      contextShapeId: PREDEFINED_SHAPES[0]?.id || '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        promptText: '',
        contextShapeId: PREDEFINED_SHAPES[0]?.id || '',
      });
    }
  }, [isOpen, form]);

  const onSubmit: SubmitHandler<AiChatFormValues> = async (data) => {
    if (!activeChannelId) {
      toast({ title: "Error", description: "No active channel selected.", variant: "destructive" });
      return;
    }
    if (!currentUserId) {
      toast({ title: "Error", description: "User information is missing.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const selectedShapeForContext = getShapeById(data.contextShapeId);
      if (!selectedShapeForContext) {
        toast({ title: "Error", description: "Invalid shape selected for context.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      // The `chatWithShape` flow will determine which bot to use (default or user-bot based on activeChannelId)
      // by page.tsx passing the appropriate apiKey and shapeUsername if it's a user-bot.
      // This dialog doesn't need to know the bot's specific credentials, only the context shape.
      const result = await chatWithShape({
        promptText: data.promptText,
        contextShapeId: data.contextShapeId, // This is the shape being discussed
        userId: currentUserId, 
        channelId: activeChannelId,
        // botApiKey and botShapeUsername are implicitly handled by the caller in page.tsx based on activeChannelId
      });

      onAiResponse({ 
        textResponse: result.responseText, 
        prompt: data.promptText, 
        sourceShapeId: data.contextShapeId // This is the shape the prompt was about
      });
      toast({ title: "Success!", description: "AI response received and added to chat." });
      onOpenChange(false);
    } catch (error) {
      console.error("Error getting AI response from dialog:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while contacting AI.";
      toast({
        title: "Error Contacting AI",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = !!activeChannelId && !!currentUserId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) { 
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquareText className="text-primary" /> Chat with AI about a Shape</DialogTitle>
          <DialogDescription>
            Ask the AI something related to the selected shape. Your message and the AI's response will be posted to the current channel.
            {!canSubmit && <span className="text-destructive block mt-1">A user and active channel are required.</span>}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promptText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message to AI</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., What is special about this shape?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contextShapeId" // Renamed from shapeId
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discuss this Shape (Context)</FormLabel>
                  <FormControl>
                    <ShapePalette 
                      onSelectShape={(shape) => field.onChange(shape.id)}
                      selectedShapeId={field.value}
                      className="border rounded-md bg-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !canSubmit}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Send to AI
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
