/**
 * Anthropic Claude Client
 *
 * Provides Claude 4.5 Sonnet for high-quality LLM responses.
 * Used for chat, blog generation, summarization, and verification.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude 4.5 Sonnet - best quality model
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// Cost tracking (per 1M tokens)
export const CLAUDE_COSTS = {
  input: 3.0,   // $3.00 per 1M input tokens
  output: 15.0, // $15.00 per 1M output tokens
};

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface ClaudeResponseWithUsage {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Generate a response using Claude 4.5 Sonnet
 */
export async function generateClaudeResponse(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const result = await generateClaudeResponseWithUsage(messages, options);
  return result.text;
}

/**
 * Generate a response using Claude 4.5 Sonnet with usage statistics
 */
export async function generateClaudeResponseWithUsage(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<ClaudeResponseWithUsage> {
  const {
    maxTokens = 1024,
    temperature = 0.3,
    system,
  } = options;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Extract text from response
  const textContent = response.content.find(block => block.type === 'text');

  return {
    text: textContent?.text || '',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate a simple completion (single user message)
 */
export async function claudeComplete(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  return generateClaudeResponse(
    [{ role: 'user', content: prompt }],
    options
  );
}

/**
 * Estimate cost for a Claude API call
 */
export function estimateClaudeCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * CLAUDE_COSTS.input;
  const outputCost = (outputTokens / 1_000_000) * CLAUDE_COSTS.output;
  return inputCost + outputCost;
}

export default anthropic;
