"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateImageWithShape } from '@/ai/flows/generate-image-with-shape';
import { PREDEFINED_SHAPES, getShapeById, type Shape } from '@/lib/shapes';
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
import { Input } from '@/components/ui/input';
import { ShapePalette } from '@/components/shape/shape-palette';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  promptText: z.string().min(1, 'Prompt is required.'),
  shapeId: z.string().min(1, 'Please select a shape.'),
});

type ImageGeneratorFormValues = z.infer<typeof formSchema>;

interface ImageGeneratorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImageGenerated: (imageData: { imageUrl: string; prompt: string; sourceShapeId: string }) => void;
}

export function ImageGeneratorDialog({ isOpen, onOpenChange, onImageGenerated }: ImageGeneratorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  // Client-side btoa function
  const [btoaFn, setBtoaFn] = useState<((str: string) => string) | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBtoaFn(() => window.btoa);
    }
  }, []);

  const form = useForm<ImageGeneratorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promptText: '',
      shapeId: PREDEFINED_SHAPES[0]?.id || '',
    },
  });

  const onSubmit: SubmitHandler<ImageGeneratorFormValues> = async (data) => {
    if (!btoaFn) {
      toast({ title: "Error", description: "Client environment not ready.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const selectedShape = getShapeById(data.shapeId);
      if (!selectedShape) {
        toast({ title: "Error", description: "Invalid shape selected.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const shapeDataUri = `data:image/svg+xml;base64,${btoaFn(selectedShape.svgString)}`;
      
      const result = await generateImageWithShape({
        promptText: data.promptText,
        shapeDataUri,
      });

      onImageGenerated({ 
        imageUrl: result.imageDataUri, 
        prompt: data.promptText, 
        sourceShapeId: data.shapeId 
      });
      toast({ title: "Success!", description: "Image generated and added to chat." });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error Generating Image",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
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
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="text-primary" /> AI Image Generator</DialogTitle>
          <DialogDescription>
            Create an image with AI, incorporating a selected shape.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promptText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image Prompt</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A futuristic city skyline" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shapeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incorporate Shape</FormLabel>
                  <FormControl>
                    <ShapePalette 
                      onSelectShape={(shape) => field.onChange(shape.id)}
                      selectedShapeId={field.value}
                      className="border rounded-md"
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
              <Button type="submit" disabled={isLoading || !btoaFn}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Image
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
