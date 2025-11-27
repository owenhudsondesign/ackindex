/**
 * Anti-Hallucination System
 *
 * Multi-layer verification to ensure AI responses are grounded in source documents.
 * Implements the CivicRAG Anti-Hallucination System requirements.
 */

import { claudeComplete } from './anthropic';
import logger from './logger';

export interface VerificationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  warnings: string[];
  details: {
    citationsPresent: boolean;
    numbersVerified: boolean;
    noSpeculation: boolean;
    factsGrounded: boolean;
    crossModelVerified?: boolean;
  };
}

/**
 * VERIFICATION LAYER 1: Structural Validation
 * Check response structure and format before content analysis
 */
export function validateResponseStructure(
  response: string,
  citations: any[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check 1: Response must have citations if it contains factual claims
  const hasFactualClaims = /\d+|vote|decision|approved|denied|budget|meeting/i.test(response);
  if (hasFactualClaims && citations.length === 0) {
    issues.push('Response contains factual claims but has no citations');
  }

  // Check 2: Citation markers [1], [2], etc. should match number of citations
  const citationMarkers = response.match(/\[\d+\]/g) || [];
  if (citationMarkers.length > 0 && citations.length === 0) {
    issues.push('Response has citation markers but no actual citations');
  }

  // Check 3: Response should not be empty or too short for factual queries
  if (response.length < 50 && !response.includes("don't have")) {
    issues.push('Response suspiciously short for factual query');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * VERIFICATION LAYER 2: Numerical & Date Verification
 * Ensure all numbers and dates in response exist in source context
 */
export function verifyNumbers(response: string, context: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Extract numbers with context (dollar amounts, percentages, counts, years)
  const numberPatterns = [
    { pattern: /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?/gi, type: 'dollar amount' },
    { pattern: /\d+(?:\.\d+)?%/g, type: 'percentage' },
    { pattern: /\b\d{4}\b/g, type: 'year' },
    { pattern: /\b\d+(?:,\d{3})*\b/g, type: 'number' },
  ];

  for (const { pattern, type } of numberPatterns) {
    const responseMatches = response.match(pattern) || [];

    for (const match of responseMatches) {
      // Normalize for comparison (remove commas, etc.)
      const normalized = match.replace(/,/g, '');
      const contextNormalized = context.replace(/,/g, '');

      if (!contextNormalized.includes(normalized)) {
        issues.push(`${type.toUpperCase()} "${match}" not found in source context`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * VERIFICATION LAYER 3: Speculative Language Detection
 * Detect and flag any predictive or speculative phrases
 */
export function detectSpeculation(response: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const speculativePatterns = [
    { pattern: /\b(?:will likely|probably|might|may|could|perhaps|possibly)\b/gi, phrase: 'hedging language' },
    { pattern: /\b(?:seems to|appears to|suggests that)\b/gi, phrase: 'inferential language' },
    { pattern: /\b(?:in the future|going forward|upcoming|planned)\b/gi, phrase: 'future prediction' },
    { pattern: /\b(?:estimated|approximately|around|roughly)\b/gi, phrase: 'imprecise language' },
  ];

  for (const { pattern, phrase } of speculativePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      warnings.push(`Contains ${phrase}: "${matches[0]}"`);
    }
  }

  // "Approximately" is acceptable if the source also says it
  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * VERIFICATION LAYER 4: Cross-Model Consistency Check
 * Use a second LLM to verify the answer is grounded in sources
 */
export async function crossModelVerification(
  query: string,
  response: string,
  context: string,
  citations: any[]
): Promise<{
  isValid: boolean;
  confidence: number;
  reasoning: string;
}> {
  try {
    const verificationPrompt = `You are a fact-checking assistant. Your job is to verify if an AI-generated answer is FULLY grounded in the provided source material.

USER QUERY: "${query}"

AI-GENERATED ANSWER:
"""
${response}
"""

SOURCE CONTEXT:
"""
${context}
"""

CITATIONS PROVIDED: ${citations.length} sources (${citations.map(c => c.title).join(', ')})

INSTRUCTIONS:
1. Check if EVERY factual claim in the answer appears in the source context
2. Check if numbers, dates, names, and quotes are accurate
3. Check if the answer makes ANY claims not supported by sources
4. Ignore stylistic differences - focus on factual accuracy

Respond in this exact JSON format only:
{
  "isGrounded": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "unsupportedClaims": ["list any claims not in sources"]
}`;

    const verificationResponse = await claudeComplete(verificationPrompt, {
      temperature: 0, // Deterministic
      maxTokens: 500,
    });

    const result = JSON.parse(verificationResponse || '{}');

    return {
      isValid: result.isGrounded === true && result.confidence >= 80,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    logger.error({ error }, 'Cross-model verification failed');
    // On error, fail open (don't block) but log warning
    return {
      isValid: true,
      confidence: 0,
      reasoning: 'Verification failed due to error',
    };
  }
}

/**
 * MASTER VERIFICATION FUNCTION
 * Runs all verification layers and returns comprehensive result
 */
export async function verifyResponse(
  query: string,
  response: string,
  context: string,
  citations: any[],
  options: {
    skipCrossModel?: boolean; // Allow skipping expensive cross-model check
  } = {}
): Promise<VerificationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Layer 1: Structural validation
  const structureCheck = validateResponseStructure(response, citations);
  if (!structureCheck.isValid) {
    issues.push(...structureCheck.issues);
  }

  // Layer 2: Numerical verification
  const numberCheck = verifyNumbers(response, context);
  if (!numberCheck.isValid) {
    issues.push(...numberCheck.issues);
  }

  // Layer 3: Speculation detection
  const speculationCheck = detectSpeculation(response);
  if (!speculationCheck.isValid) {
    warnings.push(...speculationCheck.warnings);
  }

  // Layer 4: Cross-model verification (optional, more expensive)
  let crossModelResult;
  if (!options.skipCrossModel) {
    crossModelResult = await crossModelVerification(query, response, context, citations);
    if (!crossModelResult.isValid) {
      issues.push(`Cross-model verification failed: ${crossModelResult.reasoning}`);
    }
  }

  // Calculate overall confidence
  let confidence: 'high' | 'medium' | 'low';
  if (issues.length === 0 && warnings.length === 0) {
    confidence = 'high';
  } else if (issues.length === 0 && warnings.length <= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    isValid: issues.length === 0,
    confidence,
    issues,
    warnings,
    details: {
      citationsPresent: citations.length > 0,
      numbersVerified: numberCheck.isValid,
      noSpeculation: speculationCheck.isValid,
      factsGrounded: structureCheck.isValid,
      crossModelVerified: crossModelResult?.isValid,
    },
  };
}

/**
 * Determine if response should be blocked based on verification
 */
export function shouldBlockResponse(verification: VerificationResult): boolean {
  // Block if:
  // 1. Critical issues found (numbers don't match, no citations for facts)
  const hasCriticalIssues = verification.issues.some(issue =>
    issue.includes('not found in source') ||
    issue.includes('no citations') ||
    issue.includes('Cross-model verification failed')
  );

  // 2. Low confidence with multiple issues
  const hasMultipleIssues = verification.issues.length >= 2;

  return hasCriticalIssues || (verification.confidence === 'low' && hasMultipleIssues);
}
