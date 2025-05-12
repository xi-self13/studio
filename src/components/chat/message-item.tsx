"use client";

import type { Message, User } from '@/types';
import { getShapeById } from '@/lib/shapes';
import { ShapeDisplay } from '@/components/shape/shape-display';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Bot, Trash2, RefreshCw } from 'lucide-react'; // Added Trash2, RefreshCw
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button'; // Added Button
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Added Tooltip


interface MessageItemProps {
  message: Message;
  sender: User | { uid: string, name: string | null, avatarUrl?: string | null, isBot?: boolean, dataAiHint?: string }; 
  isOwnMessage: boolean;
  onDeleteAiMessage?: (messageId: string) => void; // Added
  onRegenerateAiMessage?: (message: Message) => void; // Added
}

export function MessageItem({ message, sender, isOwnMessage, onDeleteAiMessage, onRegenerateAiMessage }: MessageItemProps) {
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
    p: ({node, ...props}: any) => <p className="text-sm whitespace-pre-wrap my-1" {...props} />, // Adjusted margin
    a: ({node, ...props}: any) => <a className="text-primary hover:underline" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-1" {...props} />,
    li: ({node, ...props}: any) => <li className="my-0.5" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary pl-2 italic my-1" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <pre className="bg-muted p-2 rounded-md overflow-x-auto my-1"><code className={`language-${match[1]}`} {...props}>{children}</code></pre>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
      )
    }
  };
  
  const isAiResponseMessage = message.content.type === 'ai_response';
  const canInteractWithAiMessage = sender.isBot && (onDeleteAiMessage || (isAiResponseMessage && onRegenerateAiMessage && message.content.prompt));


  return (
    <div className={`group/message-item flex gap-3 p-3 hover:bg-muted/30 transition-colors duration-150 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {!isOwnMessage && getAvatar()}
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} flex-1`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{getSenderName()}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'p')}
          </span>
        </div>
        <div className={`mt-1 max-w-md lg:max-w-lg xl:max-w-xl break-words prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1 ${ 
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
          {isAiResponseMessage && (
            <Card className="bg-card shadow-md w-full">
              <CardHeader className="pb-2 pt-3 px-4">
                {message.content.prompt && (
                  <CardDescription className="text-xs italic">
                    Response to: "{message.content.prompt}"
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
                    <div className="flex items-center gap-2 mt-2 not-prose"> 
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
      {canInteractWithAiMessage && (
        <TooltipProvider>
          <div className={`flex items-center space-x-1 opacity-0 group-hover/message-item:opacity-100 transition-opacity duration-150 ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
            {isAiResponseMessage && onRegenerateAiMessage && message.content.prompt && (
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onRegenerateAiMessage(message)}>
                    <RefreshCw size={14} />
                    <span className="sr-only">Regenerate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Regenerate Response</p></TooltipContent>
              </Tooltip>
            )}
            {onDeleteAiMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteAiMessage(message.id)}>
                    <Trash2 size={14} />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Delete Message</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}