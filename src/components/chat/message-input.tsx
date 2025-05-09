"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShapePalette } from '@/components/shape/shape-palette';
import type { Shape } from '@/types';
import { Send, Smile, Wand2, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => Promise<void>;
  onOpenImageGenerator: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onOpenImageGenerator, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isShapePaletteOpen, setIsShapePaletteOpen] = useState(false);

  const handleSendText = async () => {
    if (text.trim() === '') return;
    setIsSending(true);
    try {
      await onSendMessage({ type: 'text', text: text.trim() });
      setText('');
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally show a toast message for error
    } finally {
      setIsSending(false);
    }
  };

  const handleSendShape = async (shape: Shape) => {
    setIsSending(true);
    setIsShapePaletteOpen(false); // Close palette after selection
    try {
      await onSendMessage({ type: 'shape', shapeId: shape.id });
    } catch (error) {
      console.error("Error sending shape message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background sticky bottom-0">
      <div className="flex items-start gap-2 bg-secondary p-2 rounded-lg shadow">
        <Popover open={isShapePaletteOpen} onOpenChange={setIsShapePaletteOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled={disabled || isSending}>
              <Smile />
              <span className="sr-only">Open Shape Palette</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 mb-2 bg-popover border-border">
            <ShapePalette onSelectShape={handleSendShape} />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onOpenImageGenerator} disabled={disabled || isSending}>
          <Wand2 />
          <span className="sr-only">Generate AI Image</span>
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or send a shape..."
          className="flex-1 min-h-[40px] max-h-32 resize-none bg-input border-0 focus-visible:ring-1 focus-visible:ring-ring text-sm"
          disabled={disabled || isSending}
          rows={1}
        />
        <Button 
          size="icon" 
          onClick={handleSendText} 
          disabled={disabled || isSending || text.trim() === ''}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isSending && text.trim() !== '' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
          <span className="sr-only">Send Message</span>
        </Button>
      </div>
    </div>
  );
}
