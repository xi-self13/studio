
"use client";

import type { Message, User } from '@/types';
import { getShapeById } from '@/lib/shapes';
import { ShapeDisplay } from '@/components/shape/shape-display';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageItemProps {
  message: Message;
  sender: User | { uid: string, name: string | null, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string }; 
  isOwnMessage: boolean;
}

export function MessageItem({ message, sender, isOwnMessage }: MessageItemProps) {
  const getSenderName = () => {
    return sender.name || (sender.isBot ? 'Bot' : 'User');
  }

  const getAvatar = () => {
    const aiHint = sender.dataAiHint || (sender.isBot ? "bot avatar" : "user profile");
    const fallbackName = sender.name || (sender.isBot ? 'B' : 'U');

    if (sender.isBot) { 
      return (
        <Avatar className="h-10 w-10 bg-primary/20">
          {sender.avatarUrl ? (
            <AvatarImage src={sender.avatarUrl} alt={`${getSenderName()} avatar`} data-ai-hint={aiHint} />
          ) : null}
          <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
        </Avatar>
      );
    }
    return (
      <Avatar className="h-10 w-10">
        <AvatarImage src={sender.avatarUrl || undefined} alt={`${getSenderName()} avatar`} data-ai-hint={aiHint} />
        <AvatarFallback>{fallbackName.substring(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  }

  const markdownComponents = {
    // Customize how specific Markdown elements are rendered if needed
    // For example, to add Tailwind classes to paragraphs or links:
    p: ({node, ...props}: any) => <p className="text-sm whitespace-pre-wrap" {...props} />,
    a: ({node, ...props}: any) => <a className="text-primary hover:underline" {...props} />,
    // Add more custom renderers as needed (e.g., for headings, lists, code blocks)
  };

  return (
    <div className={`flex gap-3 p-3 hover:bg-muted/30 transition-colors duration-150 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {!isOwnMessage && getAvatar()}
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{getSenderName()}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'p')}
          </span>
        </div>
        <div className={`mt-1 max-w-md lg:max-w-lg xl:max-w-xl break-words prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1 ${ // Added prose classes for markdown styling
           message.content.type !== 'ai_response' && (isOwnMessage ? 'bg-primary text-primary-foreground rounded-lg p-2' : 'bg-secondary text-secondary-foreground rounded-lg p-2')
        }`}>
          {message.content.type === 'text' && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content.text}
            </ReactMarkdown>
          )}
          {message.content.type === 'shape' && (
            () => {
              const shape = getShapeById(message.content.shapeId);
              return shape ? (
                <ShapeDisplay 
                  svgString={shape.svgString} 
                  size={64} 
                  color={isOwnMessage ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'} 
                />
              ) : (
                <p className="text-sm text-destructive-foreground italic">[Unknown Shape]</p>
              );
            }
          )()}
          {message.content.type === 'ai_response' && (
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-2 pt-3 px-4">
                {message.content.prompt && (
                  <CardDescription className="text-xs italic">
                    You asked about "{message.content.prompt}"
                    {message.content.sourceShapeId && ` regarding the ${getShapeById(message.content.sourceShapeId)?.name || 'shape'}.`}
                  </CardDescription>
                )}
                 {!message.content.prompt && sender.isBot && (
                  <CardTitle className="text-sm font-medium text-card-foreground">AI Response</CardTitle>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2 prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {message.content.textResponse}
                </ReactMarkdown>
                {message.content.sourceShapeId && (() => {
                  const shape = getShapeById(message.content.sourceShapeId);
                  return shape ? (
                    <div className="flex items-center gap-2 mt-2 not-prose"> {/* Added not-prose to prevent shape display from being styled by prose */}
                       <ShapeDisplay svgString={shape.svgString} size={32} color="hsl(var(--card-foreground))" />
                       <span className="text-xs text-muted-foreground">Related shape: {shape.name}</span>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {isOwnMessage && getAvatar()}
    </div>
  );
}
