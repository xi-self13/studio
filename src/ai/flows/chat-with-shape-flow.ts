// src/ai/flows/chat-with-shape-flow.ts
'use server';

/**
 * @fileOverview Flow to interact with a Shape using the Shapes.inc API.
 *
 * - chatWithShape - A function that sends a message to a specified Shape and returns its response.
 * - ChatWithShapeInput - The input type for the chatWithShape function.
 * - ChatWithShapeOutput - The return type for the chatWithShape function.
 */

import { z } from 'genkit';
import { getShapeById } from '@/lib/shapes';

const ChatWithShapeInputSchema = z.object({
  promptText: z.string().describe('The user message to send to the Shape.'),
  shapeId: z.string().describe('The ID of the shape the user is referring to.'),
  userId: z.string().describe('The ID of the user initiating the chat.'),
  channelId: z.string().describe('The ID of the channel where the chat is happening.'),
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

  const { promptText, shapeId, userId, channelId } = input;

  const apiKey = process.env.SHAPESINC_API_KEY;
  const shapeUsername = process.env.SHAPESINC_SHAPE_USERNAME;

  if (!apiKey || !shapeUsername) {
    throw new Error(
      'Shapes API key or username is not configured in environment variables.'
    );
  }

  const selectedShape = getShapeById(shapeId);
  const shapeName = selectedShape?.name || 'the selected shape';

  // Construct a message that includes context about the shape
  const userMessageContent = `The user is interacting with the concept of a "${shapeName}". Their message is: "${promptText}"`;

  try {
    const response = await fetch('https://api.shapes.inc/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({
        model: `shapesinc/${shapeUsername}`,
        messages: [{ role: 'user', content: userMessageContent }],
        // Shapes API does not support streaming for now, and other parameters like temperature are handled by Shape settings.
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
    
    // Assuming the response structure is OpenAI-like:
    // responseData.choices[0].message.content
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
