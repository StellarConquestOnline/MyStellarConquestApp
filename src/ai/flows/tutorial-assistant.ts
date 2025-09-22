// This file is machine-generated - changes may be lost.

'use server';

/**
 * @fileOverview Provides an AI assistant to guide new players in understanding the game mechanics and provide strategic advice.
 *
 * - getGameExplanation - A function that explains game mechanics to new players.
 * - GetGameExplanationInput - The input type for the getGameExplanation function.
 * - GetGameExplanationOutput - The return type for the getGameExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetGameExplanationInputSchema = z.object({
  topic: z.string().describe('The specific game mechanic or strategy the player wants to understand.'),
  playerContext: z.string().optional().describe('Optional: Additional context about the player situation.'),
});
export type GetGameExplanationInput = z.infer<typeof GetGameExplanationInputSchema>;

const GetGameExplanationOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation of the requested game mechanic or strategy.'),
  strategicTips: z.string().optional().describe('Optional: Strategic tips related to the explanation.'),
});
export type GetGameExplanationOutput = z.infer<typeof GetGameExplanationOutputSchema>;

export async function getGameExplanation(input: GetGameExplanationInput): Promise<GetGameExplanationOutput> {
  return getGameExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gameExplanationPrompt',
  input: {schema: GetGameExplanationInputSchema},
  output: {schema: GetGameExplanationOutputSchema},
  prompt: `You are a helpful AI assistant designed to explain complex game mechanics and provide strategic tips for the Stellar Conquest game.

  The player is asking about: {{{topic}}}
  Player Context: {{{playerContext}}}

  Provide a clear and concise explanation of the topic. If applicable, also provide strategic tips to help the player make informed decisions.
  Make sure the explanation can be understood by a new player.
  `,
});

const getGameExplanationFlow = ai.defineFlow(
  {
    name: 'getGameExplanationFlow',
    inputSchema: GetGameExplanationInputSchema,
    outputSchema: GetGameExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
