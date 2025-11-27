/**
 * Anthropic Claude Client
 *
 * Provides Claude models for LLM responses:
 * - Haiku 3.5: Fast, cheap, good for simple factual queries (default)
 * - Sonnet 4.5: Best quality for complex reasoning
 *
 * Used for chat, blog generation, summarization, and verification.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Model identifiers
export const CLAUDE_HAIKU = 'claude-3-5-haiku-20241022';  // Fast, cheap, good for most queries
export const CLAUDE_SONNET = 'claude-sonnet-4-5-20250929'; // Best quality for complex queries

// Default model for chat (Haiku for cost efficiency)
export const CLAUDE_MODEL = CLAUDE_HAIKU;

// Cost tracking (per 1M tokens)
export const CLAUDE_COSTS = {
  // Haiku 3.5 costs (default)
  input: 0.80,   // $0.80 per 1M input tokens
  output: 4.0,   // $4.00 per 1M output tokens
};

export const SONNET_COSTS = {
  input: 3.0,    // $3.00 per 1M input tokens
  output: 15.0,  // $15.00 per 1M output tokens
};

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
  system?: string;
  model?: 'haiku' | 'sonnet';  // Choose model based on query complexity
}

export interface ClaudeResponseWithUsage {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;  // Which model was used
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
 * Custom error class for Claude API rate limits
 */
export class ClaudeRateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'ClaudeRateLimitError';
  }
}

/**
 * Generate a response using Claude with usage statistics
 * Defaults to Haiku for cost efficiency, use model: 'sonnet' for complex queries
 */
export async function generateClaudeResponseWithUsage(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<ClaudeResponseWithUsage> {
  const {
    maxTokens = 1024,
    temperature = 0.3,
    system,
    model = 'haiku',  // Default to Haiku for cost efficiency
  } = options;

  // Select model based on option
  const modelId = model === 'sonnet' ? CLAUDE_SONNET : CLAUDE_HAIKU;

  try {
    const response = await anthropic.messages.create({
      model: modelId,
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
      model: modelId,
    };
  } catch (error: any) {
    // Handle rate limit errors specifically
    if (error?.status === 429 || error?.message?.includes('rate_limit_error')) {
      throw new ClaudeRateLimitError(
        'Claude API rate limit exceeded. Please try again in a moment.',
        60 // Default retry after 60 seconds
      );
    }
    throw error;
  }
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
export function estimateClaudeCost(
  inputTokens: number,
  outputTokens: number,
  model: 'haiku' | 'sonnet' = 'haiku'
): number {
  const costs = model === 'sonnet' ? SONNET_COSTS : CLAUDE_COSTS;
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}

/**
 * Patterns that indicate a complex query requiring Sonnet
 */
const COMPLEX_QUERY_PATTERNS = [
  // Comparative questions
  /\b(compare|comparison|versus|vs\.?|differ|difference|between)\b/i,
  // Multi-part questions
  /\b(and also|as well as|in addition|furthermore|moreover)\b/i,
  // Analysis requests
  /\b(analyze|analysis|implications?|consequences?|impact)\b/i,
  // Reasoning questions
  /\b(why did|why would|why is|explain why|reasoning|rationale)\b/i,
  // Opinion/recommendation seeking
  /\b(should i|would you recommend|pros and cons|advantages|disadvantages)\b/i,
  // Hypothetical questions
  /\b(what if|what would happen|hypothetically|scenario)\b/i,
  // Summary of multiple topics
  /\b(summarize all|overview of all|everything about)\b/i,
  // Legal/procedural complexity
  /\b(legal implications?|procedural|compliance|requirements? for)\b/i,
];

/**
 * Patterns that indicate a simple query suitable for Haiku
 */
const SIMPLE_QUERY_PATTERNS = [
  // Direct factual questions
  /^(what is|what are|what was|what were|who is|who are|when is|when was|where is|how much|how many)\b/i,
  // Yes/no questions
  /^(is there|are there|did they|was there|has the|have they|can i|will the)\b/i,
  // Single topic lookups
  /\b(vote on|voted on|decision on|result of)\b/i,
  // Time-based lookups
  /\b(last meeting|recent meeting|latest|most recent)\b/i,
];

/**
 * Determine if a query is complex enough to warrant Sonnet
 * Returns 'sonnet' for complex queries, 'haiku' for simple ones
 */
export function selectModelForQuery(query: string): 'haiku' | 'sonnet' {
  // Check for complex patterns first
  const isComplex = COMPLEX_QUERY_PATTERNS.some(pattern => pattern.test(query));

  if (isComplex) {
    return 'sonnet';
  }

  // Check for simple patterns (if matches, definitely use Haiku)
  const isSimple = SIMPLE_QUERY_PATTERNS.some(pattern => pattern.test(query));

  if (isSimple) {
    return 'haiku';
  }

  // Default to Haiku for cost efficiency
  // Most RAG queries are factual lookups that Haiku handles well
  return 'haiku';
}

export default anthropic;
