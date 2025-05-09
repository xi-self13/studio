
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
import { Textarea } from '@/components/ui/textarea';
import { ShapePalette } from '@/components/shape/shape-palette';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, Loader2, Sparkles } from 'lucide-react';

const formSchema = z.object({
  promptText: z.string().min(1, 'Prompt is required.'),
  contextShapeId: z.string().min(1, 'Please select a shape to discuss.'),
});

type AiChatFormValues = z.infer<typeof formSchema>;

interface AiChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAiResponse: (responseData: { textResponse: string; prompt: string; sourceShapeId: string }) => void;
  currentUserId?: string | null; // Firebase UID
  activeChannelId: string | null; 
}

export function AiChatDialog({ 
  isOpen, 
  onOpenChange, 
  onAiResponse,
  currentUserId, // This is the Firebase UID
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
      toast({ title: "Error", description: "User information is missing. Please ensure you are logged in.", variant: "destructive" });
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
      
      const result = await chatWithShape({
        promptText: data.promptText,
        contextShapeId: data.contextShapeId,
        userId: currentUserId, // Pass Firebase UID
        channelId: activeChannelId,
      });

      onAiResponse({ 
        textResponse: result.responseText, 
        prompt: data.promptText, 
        sourceShapeId: data.contextShapeId 
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
            {!canSubmit && <span className="text-destructive block mt-1">An active channel is required and you must be logged in.</span>}
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
              name="contextShapeId"
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
