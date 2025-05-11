// src/ai/flows/chat-with-shape-flow.ts
'use server';

/**
 * @fileOverview Flow to interact with a Shape using the Shapes.inc API.
 * Supports both a default bot using environment variables and user-created bots with specific credentials.
 * Includes prompt augmentation to simulate "thinking" or "searching" based on user input.
 *
 * - chatWithShape - A function that sends a message to a specified Shape and returns its response.
 * - ChatWithShapeInput - The input type for the chatWithShape function.
 * - ChatWithShapeOutput - The return type for the chatWithShape function.
 */

import { z } from 'genkit'; // z is for zod schema validation
import { getShapeById } from '@/lib/shapes';

const ChatWithShapeInputSchema = z.object({
  promptText: z.string().min(1, 'Prompt text cannot be empty.').describe('The user message to send to the Shape.'),
  contextShapeId: z.string().describe('The ID of the predefined shape used as context for the conversation. (Currently informational for prompt construction, not directly used by Shapes API in a specific field).'),
  userId: z.string().describe('The Firebase UID of the user initiating the chat.'),
  channelId: z.string().describe('The ID of the channel where the chat is happening.'),
  systemPrompt: z.string().optional().describe('An optional system prompt to guide the bot\'s personality or behavior.'),
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
    console.error("ChatWithShapeInput validation error:", parseResult.error.flatten());
    throw new Error(`Invalid input for chatWithShape: ${parseResult.error.message}`);
  }

  const { promptText, contextShapeId, userId, channelId, systemPrompt, botApiKey, botShapeUsername } = input;

  const apiKeyToUse = botApiKey || process.env.SHAPESINC_API_KEY;
  const shapeUsernameToUse = botShapeUsername || process.env.SHAPESINC_SHAPE_USERNAME;

  if (!apiKeyToUse || !shapeUsernameToUse) {
    console.error("Shapes API key or username is not configured.", {
        botApiKeyProvided: !!botApiKey,
        botShapeUsernameProvided: !!botShapeUsername,
        envApiKeyExists: !!process.env.SHAPESINC_API_KEY,
        envShapeUsernameExists: !!process.env.SHAPESINC_SHAPE_USERNAME
    });
    throw new Error(
      'Shapes API key or username is not configured. Ensure environment variables are set for the default bot, or credentials are provided for user-created bots.'
    );
  }

  const selectedShape = getShapeById(contextShapeId);
  const shapeNameForContext = selectedShape?.name || 'the selected concept';
  
  let augmentedPromptText = promptText;
  const lowerCasePrompt = promptText.toLowerCase();

  // Keywords for "searching" or information retrieval
  const searchKeywords = ["search for", "find out about", "what is", "tell me about", "explain", "define", "research", "look up"];
  // Keywords for "thinking" or deeper analysis
  const thinkingKeywords = ["think about", "consider", "analyze", "reflect on"];

  let prePrompt = "";

  if (searchKeywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    prePrompt = `The user is looking for information or an explanation. `;
  } else if (thinkingKeywords.some(keyword => lowerCasePrompt.includes(keyword))) {
    prePrompt = `The user is asking for a thoughtful analysis or consideration. `;
  }
  
  let userMessageContent: string;

  if (systemPrompt) {
    userMessageContent = `${systemPrompt}\n\n${prePrompt}Regarding "${shapeNameForContext}", user query: ${promptText}`;
  } else {
    userMessageContent = `${prePrompt}User query regarding "${shapeNameForContext}": ${promptText}`;
  }
  
  // Ensure the final userMessageContent is not just the prePrompt if promptText was empty
  if (promptText.trim() === "" && prePrompt.trim() !== "") {
      userMessageContent = prePrompt + `Please provide a general response regarding "${shapeNameForContext}".`;
  } else if (promptText.trim() === "" && prePrompt.trim() === "") {
    // This case should be prevented by schema validation, but as a failsafe.
    userMessageContent = `User query regarding "${shapeNameForContext}": Please provide a general response.`;
  }


  const messagesPayload = [{ role: 'user', content: userMessageContent.trim() }];

  try {
    const requestPayloadLog = {
        model: `shapesinc/${shapeUsernameToUse}`,
        userId,
        channelId,
        messageContentLength: userMessageContent.trim().length
    };

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

    const responseBodyText = await response.text(); 

    if (!response.ok) {
      console.error('Shapes API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: responseBodyText, 
        requestDetails: requestPayloadLog
      });
      
      let detailedErrorMessage = `Shapes API request failed with status ${response.status}.`;
      try {
        const parsedError = JSON.parse(responseBodyText);
        if (parsedError && parsedError.error && parsedError.error.message) {
          detailedErrorMessage += ` Message: ${parsedError.error.message}`;
        } else if (responseBodyText) {
          detailedErrorMessage += ` Details: ${responseBodyText.substring(0, 300)}`;
        }
      } catch (e) {
        if (responseBodyText) {
          detailedErrorMessage += ` Details: ${responseBodyText.substring(0, 300)}`;
        }
      }
      throw new Error(detailedErrorMessage);
    }

    try {
      const responseData = JSON.parse(responseBodyText);
      const aiMessage = responseData.choices?.[0]?.message?.content;

      if (typeof aiMessage !== 'string') {
        console.error('Unexpected response structure from Shapes API (choices.message.content not a string):', responseData);
        throw new Error('Failed to extract message content from Shapes API response. Structure was unexpected.');
      }
      return { responseText: aiMessage };
    } catch (jsonError) {
      console.error('Error parsing Shapes API JSON response (even though status was ok):', jsonError, { rawBody: responseBodyText });
      throw new Error(`Failed to parse successful Shapes API response as JSON. Status: ${response.status}. Body (partial): ${responseBodyText.substring(0, 300)}`);
    }

  } catch (error) {
    console.error('Exception during Shapes API call in chatWithShape:', error); 
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('dns')) {
             throw new Error('Network connection to the Shapes API failed. Please check your internet connection or try again later.');
        }
        throw new Error(error.message || 'An error occurred while processing the request with the Shapes API.');
    }
    throw new Error('An unknown error occurred while communicating with the Shapes API.');
  }
}
