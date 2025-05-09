// src/ai/flows/generate-image-with-shape.ts
'use server';

/**
 * @fileOverview Image generation flow that incorporates a specific shape into the generated image.
 *
 * - generateImageWithShape - A function that generates an image incorporating a specific shape.
 * - GenerateImageWithShapeInput - The input type for the generateImageWithShape function.
 * - GenerateImageWithShapeOutput - The return type for the generateImageWithShape function.
 */

import {ai} from '@/ai/genkit';
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
  return generateImageWithShapeFlow(input);
}

const generateImageWithShapePrompt = ai.definePrompt({
  name: 'generateImageWithShapePrompt',
  input: {schema: GenerateImageWithShapeInputSchema},
  output: {schema: GenerateImageWithShapeOutputSchema},
  prompt: `Generate an image based on the following description, incorporating the given shape into the image.

Description: {{{promptText}}}
Shape: {{media url=shapeDataUri}}`,
});

const generateImageWithShapeFlow = ai.defineFlow(
  {
    name: 'generateImageWithShapeFlow',
    inputSchema: GenerateImageWithShapeInputSchema,
    outputSchema: GenerateImageWithShapeOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.shapeDataUri}},
        {text: input.promptText},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    return {imageDataUri: media.url!};
  }
);
