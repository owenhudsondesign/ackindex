/**
 * Shared OpenAI Client
 * Reusable OpenAI instance for all OpenAI API calls
 */

import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
