// src/ai/flows/generate-image-with-shape.ts
'use server';

/**
 * @fileOverview Image generation flow that incorporates a specific shape into the generated image.
 * This version mocks a call to a fictional "Shapes.Inc API".
 *
 * - generateImageWithShape - A function that generates an image incorporating a specific shape.
 * - GenerateImageWithShapeInput - The input type for the generateImageWithShape function.
 * - GenerateImageWithShapeOutput - The return type for the generateImageWithShape function.
 */

import {z} from 'genkit';

const GenerateImageWithShapeInputSchema = z.object({
  promptText: z.string().describe('The text prompt for generating the image.'),
  shapeDataUri: z
    .string()
    .describe(
      'The shape to incorporate into the image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type GenerateImageWithShapeInput = z.infer<
  typeof GenerateImageWithShapeInputSchema
>;

const GenerateImageWithShapeOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type GenerateImageWithShapeOutput = z.infer<
  typeof GenerateImageWithShapeOutputSchema
>;

export async function generateImageWithShape(
  input: GenerateImageWithShapeInput
): Promise<GenerateImageWithShapeOutput> {
  // Validate input (optional, Zod does this if types are enforced, but good for direct calls)
  const parseResult = GenerateImageWithShapeInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Invalid input: ${parseResult.error.message}`);
  }

  // Simulate API call to Shapes.Inc
  console.log('Simulating call to Shapes.Inc API with input:', input);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

  // Create a dummy SVG data URI as the "generated image"
  const truncatedPrompt = input.promptText.length > 40
    ? input.promptText.substring(0, 37) + "..."
    : input.promptText;

  const mockSvg = `
<svg width="350" height="120" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif; background-color: #f0f8ff; border: 1px solid #add8e6; border-radius: 8px; padding: 10px;">
  <style>
    .title { font-size: 16px; fill: #005a9c; font-weight: bold; }
    .text { font-size: 12px; fill: #333333; }
    .prompt { font-style: italic; }
  </style>
  <text x="10" y="25" class="title">Mock Image from Shapes.Inc API</text>
  <text x="10" y="50" class="text">Prompt: <tspan class="prompt">"${truncatedPrompt}"</tspan></text>
  <text x="10" y="70" class="text">Shape Input: Received (length: ${input.shapeDataUri.length})</text>
  <text x="10" y="90" class="text">Status: Successfully generated mock image.</text>
  <text x="10" y="110" class="text" font-size="10px" fill="#777">Shape Data (first 20 chars): ${input.shapeDataUri.substring(0,20)}...</text>
</svg>
  `.trim();

  const mockImageDataUri = `data:image/svg+xml;base64,${Buffer.from(mockSvg).toString('base64')}`;

  return { imageDataUri: mockImageDataUri };
}
