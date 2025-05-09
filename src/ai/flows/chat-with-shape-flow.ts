
// src/ai/flows/chat-with-shape-flow.ts
'use server';

/**
 * @fileOverview Flow to interact with a Shape using the Shapes.inc API.
 * Supports both a default bot using environment variables and user-created bots with specific credentials.
 *
 * - chatWithShape - A function that sends a message to a specified Shape and returns its response.
 * - ChatWithShapeInput - The input type for the chatWithShape function.
 * - ChatWithShapeOutput - The return type for the chatWithShape function.
 */

import { z } from 'genkit';
import { getShapeById } from '@/lib/shapes';

const ChatWithShapeInputSchema = z.object({
  promptText: z.string().describe('The user message to send to the Shape.'),
  contextShapeId: z.string().describe('The ID of the predefined shape used as context for the conversation.'),
  userId: z.string().describe('The Firebase UID of the user initiating the chat.'),
  channelId: z.string().describe('The ID of the channel where the chat is happening.'),
  systemPrompt: z.string().optional().describe('An optional system prompt to guide the bot\'s personality or behavior.'), // New field
  // Optional: For user-created bots
  botApiKey: z.string().optional().describe('The API key for the specific bot, if not using default.'),
  botShapeUsername: z.string().optional().describe('The Shape username for the specific bot, if not using default.'),
});

export type ChatWithShapeInput = z.infer<typeof ChatWithShapeInputSchema>;

const ChatWithShapeOutputSchema = z.object({
  responseText: z.string().describe('The textual response from the Shape.'),
});

export type ChatWithShapeOutput = z.infer<typeof ChatWithShapeOutputSchema>;

export async function chatWithShape(
  input: ChatWithShapeInput
): Promise<ChatWithShapeOutput> {
  const parseResult = ChatWithShapeInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Invalid input: ${parseResult.error.message}`);
  }

  const { promptText, contextShapeId, userId, channelId, systemPrompt, botApiKey, botShapeUsername } = input;

  const apiKeyToUse = botApiKey || process.env.SHAPESINC_API_KEY;
  const shapeUsernameToUse = botShapeUsername || process.env.SHAPESINC_SHAPE_USERNAME;

  if (!apiKeyToUse || !shapeUsernameToUse) {
    throw new Error(
      'Shapes API key or username is not configured. Ensure environment variables are set for the default bot, or credentials are provided for user-created bots.'
    );
  }

  const selectedShape = getShapeById(contextShapeId);
  const shapeNameForContext = selectedShape?.name || 'the selected concept';

  // Construct messages array
  // Shapes API typically uses the last user message. System prompt isn't directly supported via a "system" role in the same way as OpenAI.
  // Instead, it's usually part of the Shape's configuration on Shapes.inc.
  // If a systemPrompt is provided here, we might prepend it to the user's message or log a warning that it's not natively used by Shapes API in message array.
  // For now, we will prepend it to the user message content if provided.
  // However, the Shapes API documentation states: "System/developer role message - (these are already part of the shape settings)"
  // "Essentially, we ignore all other messages except the last role=”user” message in the request."
  // This means sending a separate system message in the array might be ignored.
  // The best way to use `systemPrompt` with Shapes.inc API, if it's not part of the persisted Shape config,
  // would be to incorporate its essence into the user's message or rely on the Shape's pre-configuration.

  let userMessageContent = `The user is interacting with the concept of a "${shapeNameForContext}". Their message is: "${promptText}"`;
  if (systemPrompt) {
     // Prepending the system prompt to the user's content, as Shapes API focuses on the last user message.
     // This is a workaround as Shapes API doesn't use a "system" role message in the array.
    userMessageContent = `${systemPrompt}\n\nRegarding the concept of a "${shapeNameForContext}", the user's message is: "${promptText}"`;
    // Or, if the API might respect it (though docs say otherwise):
    // messages.unshift({ role: 'system', content: systemPrompt });
  }
  
  const messagesPayload = [{ role: 'user', content: userMessageContent }];

  try {
    const response = await fetch('https://api.shapes.inc/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyToUse}`,
        'Content-Type': 'application/json',
        'X-User-Id': userId, 
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({
        model: `shapesinc/${shapeUsernameToUse}`,
        messages: messagesPayload,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Shapes API Error:', errorBody);
      throw new Error(
        `Shapes API request failed with status ${response.status}: ${errorBody}`
      );
    }

    const responseData = await response.json();
    const aiMessage = responseData.choices?.[0]?.message?.content;

    if (typeof aiMessage !== 'string') {
      console.error('Unexpected response structure from Shapes API:', responseData);
      throw new Error('Failed to extract message from Shapes API response.');
    }

    return { responseText: aiMessage };
  } catch (error) {
    console.error('Error calling Shapes API:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while communicating with Shapes API.');
  }
}
