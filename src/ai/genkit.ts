import {genkit} from 'genkit';
// import {googleAI} from '@genkit-ai/googleai'; // Removed googleAI plugin

export const ai = genkit({
  plugins: [
    // googleAI() // Removed googleAI plugin
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed default model as it's tied to googleAI
});
