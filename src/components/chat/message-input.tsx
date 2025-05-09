
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShapePalette } from '@/components/shape/shape-palette';
import type { Shape } from '@/types';
import { Send, Smile, Sparkles, Loader2 } from 'lucide-react'; 

interface MessageInputProps {
  onSendMessage: (content: { type: 'text'; text: string } | { type: 'shape'; shapeId: string }) => Promise<void>;
  onOpenAiChat: () => void; 
  disabled?: boolean;
  onUserTyping: (isTyping: boolean) => void; // New prop
}

export function MessageInput({ onSendMessage, onOpenAiChat, disabled = false, onUserTyping }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isShapePaletteOpen, setIsShapePaletteOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendText = async () => {
    if (text.trim() === '') return;
    setIsSending(true);
    try {
      await onSendMessage({ type: 'text', text: text.trim() });
      setText('');
      onUserTyping(false); // User sent message, so not typing anymore
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendShape = async (shape: Shape) => {
    setIsSending(true);
    setIsShapePaletteOpen(false); 
    try {
      await onSendMessage({ type: 'shape', shapeId: shape.id });
      onUserTyping(false); 
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
    } else {
      onUserTyping(true); // User is typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onUserTyping(false); // Assume user stopped typing if no input for a while
      }, 2000); // 2 seconds timeout
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    onUserTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onUserTyping(false);
    }, 2000);
  };

  const handleBlur = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onUserTyping(false); // User blurred input, so not typing
  };

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);


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
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onOpenAiChat} disabled={disabled || isSending}>
          <Sparkles /> 
          <span className="sr-only">Chat with AI</span>
        </Button>
        <Textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur} // Handle blur to stop typing indicator
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

    