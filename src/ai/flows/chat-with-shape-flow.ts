
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
  userId: z.string().describe('The Firebase UID of the user initiating the chat.'), // Updated description
  channelId: z.string().describe('The ID of the channel where the chat is happening.'),
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

  const { promptText, contextShapeId, userId, channelId, botApiKey, botShapeUsername } = input;

  // Use provided bot credentials or fallback to environment variables for the default bot
  const apiKeyToUse = botApiKey || process.env.SHAPESINC_API_KEY;
  const shapeUsernameToUse = botShapeUsername || process.env.SHAPESINC_SHAPE_USERNAME;

  if (!apiKeyToUse || !shapeUsernameToUse) {
    throw new Error(
      'Shapes API key or username is not configured. Ensure environment variables are set for the default bot, or credentials are provided for user-created bots.'
    );
  }

  const selectedShape = getShapeById(contextShapeId);
  const shapeNameForContext = selectedShape?.name || 'the selected concept';

  // Construct a message that includes context about the shape
  const userMessageContent = `The user is interacting with the concept of a "${shapeNameForContext}". Their message is: "${promptText}"`;

  try {
    const response = await fetch('https://api.shapes.inc/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyToUse}`,
        'Content-Type': 'application/json',
        'X-User-Id': userId, // This should be the Firebase UID of the human user
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({
        model: `shapesinc/${shapeUsernameToUse}`,
        messages: [{ role: 'user', content: userMessageContent }],
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
