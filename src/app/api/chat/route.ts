import { NextRequest, NextResponse } from 'next/server';
import { generateClaudeResponseWithUsage, CLAUDE_MODEL, CLAUDE_COSTS, SONNET_COSTS, ClaudeRateLimitError, selectModelForQuery, type ClaudeMessage } from '@/lib/anthropic';
import { retrieveRelevantChunks, buildContext, extractCitations, hasRelevantResults, deduplicateResults, isRecencyQuery, isTopicExplorationQuery } from '@/lib/retrieval';
import { canUserQuery, recordUsage, getUserDashboard } from '@/lib/userProfile';
import { generateFingerprint, getOrCreateAnonymousSession, recordAnonymousUsage, ANONYMOUS_QUERY_LIMIT } from '@/lib/anonymousSession';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { captureException, setUserContext } from '@/lib/sentry';
import { validateUserInput, createSecureSystemPrompt, validateAIResponse } from '@/lib/promptSecurity';
import { verifyResponse, shouldBlockResponse } from '@/lib/antiHallucination';
import logger from '@/lib/logger';
import { logQuery } from '@/lib/analytics';
import { createConversation, addMessage, getRecentMessages, autoGenerateTitle, updateConversationTitle } from '@/lib/conversations';
import { checkRateLimit, checkGlobalRateLimit, getRateLimitTier, createRateLimitHeaders } from '@/lib/rateLimit';
import { getCachedChatResponse, setCachedChatResponse } from '@/lib/cache';

/**
 * Follow-up query patterns that indicate user is referencing previous context
 */
const FOLLOW_UP_PATTERNS = [
  /^(?:what|how|when|where|who)\s+(?:about|did)\s+(?:they|that|it|this)/i,
  /^(?:and|but|also|furthermore)/i,
  /^(?:can you|could you)\s+(?:tell me more|elaborate|explain)/i,
  /^(?:more|further)\s+(?:details?|information)/i,
  /\b(?:that|this|it|they|them|those|these)\b.*\?$/i,
  /^(?:why|how come)/i,
  /^what else/i,
  /^tell me more/i,
  /^expand on/i,
  /^go into detail/i,
  /^what (?:was|were|is|are) the\b/i, // "what was the vote?", "what were the results?"
  /^(?:who|what|when|where|how)\s+(?:was|were|is|are|did)\b/i, // Short follow-up questions
  /\bfor me\b.*\?$/i, // "what does this mean for me?" "how does this affect me?"
  /\baffect(?:s)?\s+(?:me|us|residents|citizens|homeowners)/i, // "how does this affect residents?"
  /\bmean(?:s)?\s+for\b/i, // "what does this mean for..."
  /^(?:so|okay|ok)\s+/i, // "so what happens next?", "okay, but..."
  /^(?:what|how)\s+(?:should|do|can|will)\s+(?:i|we)\b/i, // "what should I do?", "how can I..."
  /^how about\b/i, // "how about as a business owner", "how about for seniors"
  /^what about\b/i, // "what about businesses", "what about parking"
  /^(?:and|but)\s+(?:what|how|if)\b/i, // "and what if...", "but how..."
  /^as a\s+\w+/i, // "as a homeowner...", "as a business owner..."
];

/**
 * Detect if query is a follow-up that needs context resolution
 */
function isFollowUpQuery(query: string): boolean {
  return FOLLOW_UP_PATTERNS.some(p => p.test(query));
}

/**
 * Resolve follow-up query using conversation history
 * Extracts topics from previous exchange and appends context
 */
function resolveFollowUpQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }>
): string {
  if (!isFollowUpQuery(query) || conversationHistory.length === 0) {
    return query;
  }

  // Get the last assistant response and user query for context
  const lastAssistant = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-1)[0];

  const lastUser = conversationHistory
    .filter(m => m.role === 'user')
    .slice(-1)[0];

  if (!lastAssistant || !lastUser) {
    return query;
  }

  // Extract key topics from previous exchange
  const topics: string[] = [];
  const combinedPrevious = `${lastUser.content} ${lastAssistant.content}`;

  // Look for acronyms (all caps, 2-6 letters) - catches NRTA, PFAS, STR, etc.
  const acronyms = combinedPrevious.match(/\b[A-Z]{2,6}\b/g);
  if (acronyms) {
    // Filter out common words that might be caps (THE, AND, etc.)
    const validAcronyms = acronyms.filter(a => !['THE', 'AND', 'FOR', 'BUT', 'NOT', 'ARE', 'WAS', 'HAS'].includes(a));
    topics.push(...validAcronyms.slice(0, 2));
  }

  // Look for proper nouns (capitalized sequences of 2+ words)
  const properNouns = combinedPrevious.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
  if (properNouns) {
    topics.push(...properNouns.slice(0, 2));
  }

  // Look for "Wave on Demand" style service names (Title Case phrases)
  const serviceNames = combinedPrevious.match(/\b([A-Z][a-z]+(?:\s+(?:on|of|the|and|for)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g);
  if (serviceNames) {
    topics.push(...serviceNames.slice(0, 1));
  }

  // Look for quoted terms
  const quotedTerms = combinedPrevious.match(/"([^"]+)"/g);
  if (quotedTerms) {
    topics.push(...quotedTerms.map(t => t.replace(/"/g, '')).slice(0, 2));
  }

  // Look for "about X" or "regarding X" patterns
  const aboutPattern = /(?:about|regarding|concerning)\s+(?:the\s+)?([^.,]+)/gi;
  let match;
  while ((match = aboutPattern.exec(combinedPrevious)) !== null) {
    const topic = match[1].trim();
    if (topic.length > 3 && topic.length < 50) {
      topics.push(topic);
    }
  }

  // If we found topics, prepend them to the query for better retrieval
  const uniqueTopics = [...new Set(topics)].slice(0, 3);
  if (uniqueTopics.length > 0) {
    const context = uniqueTopics.join(' and ');
    return `${query} (regarding ${context})`;
  }

  return query;
}

// Server-side Supabase client for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Get user from request (checks cookies first, then Bearer token)
async function getUserFromRequest(request: NextRequest) {
  // First, try to get user from cookies (for browser requests)
  try {
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Use getUser() instead of getSession() for secure server-side auth
    const { data: { user }, error } = await supabaseSSR.auth.getUser();

    if (!error && user) {
      return {
        id: user.id,
        email: user.email || '',
      };
    }
  } catch (error) {
    // Silent fail for cookie auth, will try Bearer token next
  }

  // Fall back to Bearer token (for API requests)
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Auth failures are expected for invalid tokens, log at debug level
      logger.debug({ error: error?.message }, 'Token authentication failed');
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    logger.debug({ err: error }, 'Token validation error');
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Create request logger with context
  const log = logger.child({ endpoint: '/api/chat' });

  // Track request timing for analytics
  const startTime = Date.now();

  // Declare variables outside try block so they're accessible in catch
  let body: any;
  let message: string | undefined;
  let conversationId: string | undefined;
  let conversationHistory: { role: string; content: string }[] = [];

  try {
    body = await request.json();
    message = body.message;
    conversationId = body.conversationId; // Optional - if provided, continue conversation
    const clientHistory = body.history || []; // Client-side history for anonymous/free users

    if (!message || typeof message !== 'string') {
      log.warn('Chat request missing message field');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    log.info({ messageLength: message.length }, 'Received chat query');

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Check global IP rate limit first (abuse protection)
    const globalRateLimit = await checkGlobalRateLimit(clientIp);
    if (!globalRateLimit.allowed) {
      log.warn({ clientIp, resetInSeconds: globalRateLimit.resetInSeconds }, 'Global rate limit exceeded');
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${globalRateLimit.resetInSeconds} seconds.`,
          retryAfter: globalRateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(globalRateLimit),
        }
      );
    }

    // Check if user is authenticated
    const user = await getUserFromRequest(request);

    // Anonymous session tracking
    let isAnonymous = false;
    let anonymousFingerprint: string | undefined;
    let anonymousSession: Awaited<ReturnType<typeof getOrCreateAnonymousSession>> | null = null;

    if (!user) {
      // No authenticated user - handle as anonymous
      isAnonymous = true;
      anonymousFingerprint = generateFingerprint(request);

      log.info({ fingerprint: anonymousFingerprint }, 'Anonymous chat request');

      // Get or create anonymous session
      anonymousSession = await getOrCreateAnonymousSession(anonymousFingerprint);

      if (!anonymousSession) {
        log.error({ fingerprint: anonymousFingerprint }, 'Failed to create anonymous session');
        return NextResponse.json(
          { error: 'Unable to process request. Please try again.' },
          { status: 500 }
        );
      }

      // Check if anonymous user has queries remaining
      if (!anonymousSession.canQuery) {
        log.info({ fingerprint: anonymousFingerprint, queriesUsed: anonymousSession.queriesUsed }, 'Anonymous user hit query limit');
        return NextResponse.json(
          {
            error: 'Free trial limit reached',
            message: `You've used your ${ANONYMOUS_QUERY_LIMIT} free questions. Sign up for a free account to get unlimited access!`,
            signupRequired: true,
            isAnonymous: true,
            queriesUsed: anonymousSession.queriesUsed,
            queryLimit: ANONYMOUS_QUERY_LIMIT,
          },
          { status: 429 } // Too Many Requests
        );
      }

      log.info({ fingerprint: anonymousFingerprint, queriesRemaining: anonymousSession.queriesRemaining }, 'Anonymous user authorized to query');
    } else {
      // Authenticated user
      log.setBindings({ userId: user.id, userEmail: user.email });
      log.info('User authenticated successfully');

      // Check if user has tokens remaining
      const canQuery = await canUserQuery(user.id);
      if (!canQuery) {
        const dashboard = await getUserDashboard(user.id);
        return NextResponse.json(
          {
            error: 'Token limit exceeded',
            message: `You've used all ${dashboard?.tokens_used_this_month || 0} of your monthly tokens. Upgrade to Premium for unlimited access!`,
            upgradeRequired: true,
          },
          { status: 429 } // Too Many Requests
        );
      }

      log.info('User authorized to query');
    }

    // Step 0: Handle conversation (PREMIUM ONLY FEATURE)
    let activeConversationId = conversationId;
    conversationHistory = [];
    let isPremium = false;
    let dashboard: Awaited<ReturnType<typeof getUserDashboard>> | null = null;

    if (!isAnonymous && user) {
      // Get user's subscription tier (only for authenticated users)
      dashboard = await getUserDashboard(user.id);

      // Admins get premium features regardless of subscription tier
      const isAdmin = dashboard?.role === 'admin';
      isPremium = dashboard?.subscription_tier === 'premium' || isAdmin;
    }

    // Per-user/tier rate limiting (requests per minute)
    const rateLimitIdentifier = isAnonymous ? anonymousFingerprint! : user!.id;
    const rateLimitTier = getRateLimitTier(isAnonymous, isPremium);
    const userRateLimit = await checkRateLimit(rateLimitIdentifier, rateLimitTier);

    if (!userRateLimit.allowed) {
      log.warn({
        identifier: rateLimitIdentifier,
        tier: rateLimitTier,
        resetInSeconds: userRateLimit.resetInSeconds,
      }, 'User rate limit exceeded');

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `You're sending requests too quickly. Please wait ${userRateLimit.resetInSeconds} seconds before trying again.`,
          retryAfter: userRateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(userRateLimit),
        }
      );
    }

    if (!isAnonymous && user) {
      if (isPremium) {
        // Premium users get conversation history
        if (!activeConversationId) {
          // Create new conversation
          const newConversation = await createConversation(user.id, 'New Conversation');
          if (newConversation) {
            activeConversationId = newConversation.id;
            log.info({ conversationId: activeConversationId }, 'Created new conversation (premium)');
          }
        } else {
          // Load conversation history
          conversationHistory = await getRecentMessages(activeConversationId, user.id, 8);
          log.info({ conversationId: activeConversationId, historyLength: conversationHistory.length }, 'Loaded conversation history (premium)');
        }
      } else {
        // Free users: use client-provided history for follow-up context
        if (clientHistory.length > 0) {
          conversationHistory = clientHistory.slice(-4); // Limit to last 4 messages
          log.info({ historyLength: conversationHistory.length }, 'Free user - using client-provided history');
        } else {
          log.info('Free user - stateless query mode');
        }
      }
    } else {
      // Anonymous users: use client-provided history for follow-up context
      if (clientHistory.length > 0) {
        conversationHistory = clientHistory.slice(-4); // Limit to last 4 messages
        log.info({ historyLength: conversationHistory.length }, 'Anonymous user - using client-provided history');
      } else {
        log.info('Anonymous user - stateless query mode');
      }
    }

    // Resolve follow-up queries using conversation context
    let resolvedMessage = message;
    if (conversationHistory.length > 0) {
      resolvedMessage = resolveFollowUpQuery(message, conversationHistory);
      if (resolvedMessage !== message) {
        log.info({
          original: message,
          resolved: resolvedMessage,
        }, 'Resolved follow-up query with conversation context');
      }
    }

    // Step 1: Validate and sanitize user input (prevent prompt injection)
    // Use resolved message (which may include context from follow-up resolution)
    const validation = validateUserInput(resolvedMessage, user?.id || anonymousFingerprint || 'anonymous');

    if (!validation.isValid || validation.blocked) {
      logger.warn(
        { userId: user?.id || anonymousFingerprint || 'anonymous', reason: validation.reason, warnings: validation.warnings },
        'User input blocked due to security violation'
      );

      return NextResponse.json(
        {
          error: 'Invalid input',
          message: validation.reason || 'Your message contains patterns that are not allowed. Please rephrase your question.',
        },
        { status: 400 }
      );
    }

    // Log warnings if any suspicious patterns detected
    if (validation.warnings.length > 0) {
      logger.info({ userId: user?.id || anonymousFingerprint || 'anonymous', warnings: validation.warnings }, 'Suspicious input patterns detected');
    }

    // Use sanitized input for the rest of the processing
    const sanitizedMessage = validation.sanitizedInput;

    // Check cache for identical queries (only for non-follow-up, stateless queries)
    // Follow-up queries need fresh context, so we skip cache for those
    const isFollowUp = isFollowUpQuery(message) && conversationHistory.length > 0;
    if (!isFollowUp && conversationHistory.length === 0) {
      const cachedResponse = await getCachedChatResponse(sanitizedMessage);
      if (cachedResponse) {
        log.info({ query: sanitizedMessage.substring(0, 50), cachedAt: cachedResponse.cachedAt }, 'Returning cached response');

        // Still record the query for analytics (but no Claude API cost)
        const responseTime = Date.now() - startTime;
        if (user) {
          logQuery({
            user_id: user.id,
            query_text: sanitizedMessage,
            response_text: cachedResponse.response,
            tokens_used: 0, // No tokens used for cached response
            response_time_ms: responseTime,
            has_results: true,
            num_citations: cachedResponse.citations.length,
          }).catch(err => log.error({ err }, 'Failed to log cached query'));
        }

        return NextResponse.json({
          response: cachedResponse.response,
          citations: cachedResponse.citations,
          hasContext: true,
          cached: true,
          stats: { chunksRetrieved: 0, avgSimilarity: 0 },
          usage: {
            tokensUsed: 0,
            tokensRemaining: dashboard?.tokens_remaining || 0,
            monthlyLimit: dashboard?.monthly_token_limit || 50000,
            isAnonymous,
          },
        });
      }
    }

    // Step 2: Retrieve relevant chunks using hybrid search
    // Hybrid combines semantic (vector) + keyword (text) search for better recall
    // This helps with specific terms like legal codes (e.g., "4181L") that semantic alone might miss
    // Voyage AI voyage-3-large typically returns 50-70% for relevant content, 30-40% for irrelevant
    const isRecencySearch = isRecencyQuery(sanitizedMessage);
    const isTopicExploration = isTopicExplorationQuery(sanitizedMessage);

    // Determine minimum similarity based on query type:
    // - Topic exploration: 0.35 (very broad, want ALL mentions)
    // - Recency: 0.40 (broad, recent context)
    // - Standard: 0.45 (normal threshold)
    const retrievalMinSimilarity = isTopicExploration ? 0.35 : (isRecencySearch ? 0.40 : 0.45);

    const rawResults = await retrieveRelevantChunks(sanitizedMessage, {
      maxResults: isTopicExploration ? 20 : 15, // More results for topic exploration
      minSimilarity: retrievalMinSimilarity,
      includeDocumentInfo: true,
      searchMode: 'hybrid',
    });

    log.info({
      rawResultsCount: rawResults.length,
      topSimilarity: rawResults[0]?.similarity,
      query: sanitizedMessage.substring(0, 50),
      isTopicExploration,
    }, 'Retrieved relevant chunks');

    // Debug: Log raw results details
    if (rawResults.length > 0) {
      log.info({
        topSimilarity: rawResults[0]?.similarity,
        avgSimilarity: rawResults.reduce((sum, r) => sum + r.similarity, 0) / rawResults.length
      }, 'Raw results details');
    } else {
      log.error({ query: sanitizedMessage }, 'No raw results found from vector search - possible DB/embedding issue');
    }

    // Step 2: Deduplicate results to avoid duplicate sources
    const results = deduplicateResults(rawResults, 0.9); // Remove very similar content
    log.info({ uniqueChunks: results.length }, 'Deduplicated results');

    // Debug: Log the results
    if (results.length > 0) {
      log.debug({
        topSimilarity: results[0].similarity,
        contentPreviewLength: results[0].content.length
      }, 'Top result details');
    }

    // Step 3: Check if we have relevant information
    // Use lower threshold for recency/broad/topic exploration queries
    const isRecent = isRecencyQuery(sanitizedMessage);
    // Note: isFollowUp is already defined above for cache check
    // Voyage AI voyage-3-large typically returns 50-70% for relevant content
    // Thresholds calibrated based on testing:
    // - Topic exploration: 0.40 (broad searches for all mentions)
    // - Recency: 0.45 (time-based queries)
    // - Standard: 0.50 (normal factual queries)
    const similarityThreshold = isTopicExploration ? 0.40 : (isRecent ? 0.45 : 0.50);
    const hasRelevant = hasRelevantResults(results, similarityThreshold);
    log.info({ hasRelevant, topSimilarity: results[0]?.similarity, isRecent, isTopicExploration, isFollowUp, threshold: similarityThreshold }, 'Checked relevance of results');

    // For follow-up questions with conversation history, we can answer based on
    // the previous context even if new document retrieval doesn't find highly relevant results
    const canAnswerFromConversation = isFollowUp && conversationHistory.length > 0;

    if (!hasRelevant && !canAnswerFromConversation) {
      log.info('No relevant information found for query');

      // Log query with no results for analytics (only for authenticated users)
      const responseTime = Date.now() - startTime;
      if (user) {
        logQuery({
          user_id: user.id,
          query_text: sanitizedMessage,
          response_text: "No relevant information found",
          tokens_used: 0,
          response_time_ms: responseTime,
          has_results: false,
          num_citations: 0,
        }).catch(err => {
          log.error({ err }, 'Failed to log no-results query');
        });
      }

      return NextResponse.json({
        response: "I don't have enough information in my database to answer that question. I can only provide information about content that has been uploaded to AckIndex. Please try asking about topics covered in the uploaded documents, or consider uploading more relevant content.",
        citations: [],
        hasContext: false,
      });
    }

    // Log when we're answering a follow-up from conversation context
    if (!hasRelevant && canAnswerFromConversation) {
      log.info({ historyLength: conversationHistory.length }, 'Answering follow-up question using conversation context');
    }

    // Step 4: Build context from retrieved chunks
    let context = buildContext(results);
    const citations = await extractCitations(results);

    // Add full conversation history to context for proper follow-up contextualization
    // This allows the LLM to reference specific items from any previous exchange
    if (conversationHistory.length > 0) {
      const conversationContext = conversationHistory
        .map((m: any) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          return `${role}: ${m.content}`;
        })
        .join('\n\n');

      context = `${context}\n\n--- Conversation History ---\n${conversationContext}`;

      log.info({
        conversationLength: conversationHistory.length,
        contextChars: conversationContext.length
      }, 'Added full conversation history to context');
    }

    // Also include citations if available (for premium users with server-side history)
    const previousCitations = conversationHistory
      .filter((m: any) => m.role === 'assistant' && m.citations && m.citations.length > 0)
      .slice(-2)
      .flatMap((m: any) => m.citations);

    if (previousCitations.length > 0) {
      const previousCitationsContext = previousCitations
        .map((cite: any, idx: number) => `[Previous Source ${idx + 1}] ${cite.title}: ${cite.snippet || ''}`)
        .join('\n\n');

      context = `${context}\n\n--- Previous Sources ---\n${previousCitationsContext}`;

      log.info({
        previousCitationsCount: previousCitations.length
      }, 'Added previous citations to context');
    }

    log.info({
      citationsCount: citations.length,
      contextLength: context.length,
      hasPreviousCitations: previousCitations.length > 0
    }, 'Built context from retrieved chunks');

    // Debug: Log detailed results info
    log.debug({
      results: results.map((r, i) => ({
        index: i + 1,
        similarity: r.similarity,
        contentLength: r.content?.length || 0,
        documentTitle: r.document?.title || 'No title'
      }))
    }, 'Detailed results information');

    // Step 4: Generate response with Claude 4.5 Sonnet using secure system prompt
    const systemPrompt = createSecureSystemPrompt(context);

    // Map conversation history to Claude message format
    const mappedHistory: ClaudeMessage[] = conversationHistory
      .slice(-6)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const claudeMessages: ClaudeMessage[] = [
      ...mappedHistory, // Include last 6 messages for context (3 turns)
      { role: 'user', content: sanitizedMessage },
    ];

    // Smart model selection: Use Haiku for simple queries, Sonnet for complex ones
    const selectedModel = selectModelForQuery(sanitizedMessage);

    // Debug: Log system prompt details
    log.debug({
      systemPromptLength: systemPrompt.length,
      contextLength: context.length,
      model: selectedModel
    }, 'Sending query to Claude');

    const claudeResult = await generateClaudeResponseWithUsage(claudeMessages, {
      system: systemPrompt,
      temperature: 0.3, // Low temperature for more factual responses
      maxTokens: 1024, // Allow detailed answers with quotes
      model: selectedModel, // Smart routing: haiku (default) or sonnet (complex)
    });
    const rawResponse = claudeResult.text;

    log.info({
      model: claudeResult.model,
      selectedModel,
      query: sanitizedMessage.substring(0, 50),
    }, 'Model selected for query');

    // Validate AI response for potential system prompt leaks
    const responseValidation = validateAIResponse(rawResponse);

    if (!responseValidation.isValid) {
      logger.error({ userId: user?.id || anonymousFingerprint || 'anonymous' }, 'AI response contained system prompt leak');
      captureException(new Error('AI response validation failed'), {
        tags: { endpoint: '/api/chat', issue: 'prompt-leak' },
        extra: { userId: user?.id || anonymousFingerprint || 'anonymous' },
      });
    }

    const response = responseValidation.sanitizedResponse;

    // Log LLM response details
    log.info({
      responseLength: response.length,
      responseValid: responseValidation.isValid
    }, 'Generated LLM response successfully');

    // ANTI-HALLUCINATION: Multi-layer verification
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const verification = await verifyResponse(
      sanitizedMessage,
      response,
      context,
      citations,
      { skipCrossModel: false } // Enable cross-model verification for maximum accuracy
    );

    log.info({
      verificationValid: verification.isValid,
      verificationConfidence: verification.confidence,
      issuesCount: verification.issues.length,
      warningsCount: verification.warnings.length,
    }, 'Completed anti-hallucination verification');

    // Log verification details
    if (verification.issues.length > 0) {
      log.warn({ issues: verification.issues }, 'Verification issues detected');
    }
    if (verification.warnings.length > 0) {
      log.info({ warnings: verification.warnings }, 'Verification warnings detected');
    }

    // Handle verification failures
    // For follow-up questions, add a disclaimer instead of blocking
    // For regular queries, block if verification fails critical checks
    const wouldBlock = shouldBlockResponse(verification);

    if (wouldBlock && !isFollowUp) {
      log.error({
        userId: user?.id || anonymousFingerprint,
        query: sanitizedMessage,
        issues: verification.issues,
      }, 'Response BLOCKED due to hallucination risk');

      // Log the blocked response for analysis (fire-and-forget, don't block response)
      Promise.resolve(supabase.from('verification_logs').insert({
        query_text: sanitizedMessage,
        response_text: response,
        user_id: user?.id || null,
        is_valid: false,
        confidence: verification.confidence,
        issues: verification.issues,
        warnings: verification.warnings,
        citations_present: verification.details.citationsPresent,
        numbers_verified: verification.details.numbersVerified,
        no_speculation: verification.details.noSpeculation,
        facts_grounded: verification.details.factsGrounded,
        cross_model_verified: verification.details.crossModelVerified,
        retrieval_similarity: results[0]?.similarity || 0,
        num_citations: citations.length,
        response_time_ms: Date.now() - startTime,
      })).catch(err => log.error({ err }, 'Failed to log blocked response'));

      // Return fallback instead of potentially hallucinated response
      return NextResponse.json({
        response: "I found information that might be relevant, but I cannot verify its accuracy with high confidence. To avoid providing incorrect information, I recommend checking the original source documents directly or rephrasing your question.",
        citations: citations, // Still show sources so user can check manually
        hasContext: true,
        blocked: true,
        verificationIssues: verification.issues,
      });
    }

    // For follow-up questions with verification issues, add a disclaimer instead of blocking
    let finalResponse = response;
    if (wouldBlock && isFollowUp) {
      log.info({
        userId: user?.id || anonymousFingerprint,
        query: sanitizedMessage,
        issues: verification.issues,
      }, 'Adding disclaimer to follow-up response instead of blocking');

      finalResponse = `${response}\n\n---\n*Note: This response is based on our conversation context. For important decisions, please verify with the original meeting recordings or official documents.*`;
    }

    // Log successful verification (fire-and-forget, don't block response)
    Promise.resolve(supabase.from('verification_logs').insert({
      query_text: sanitizedMessage,
      response_text: response,
      user_id: user?.id || null,
      is_valid: verification.isValid,
      confidence: verification.confidence,
      issues: verification.issues,
      warnings: verification.warnings,
      citations_present: verification.details.citationsPresent,
      numbers_verified: verification.details.numbersVerified,
      no_speculation: verification.details.noSpeculation,
      facts_grounded: verification.details.factsGrounded,
      cross_model_verified: verification.details.crossModelVerified,
      retrieval_similarity: results[0]?.similarity || 0,
      num_citations: citations.length,
      response_time_ms: Date.now() - startTime,
    })).catch(err => log.error({ err }, 'Failed to log verification'));

    // Record metrics for anti-hallucination dashboard (fire-and-forget)
    Promise.resolve(supabase.rpc('record_query_metrics', {
      p_has_citations: citations.length > 0,
      p_has_results: true,
      p_avg_similarity: avgSimilarity,
      p_confidence: verification.confidence,
      p_is_verified: verification.isValid,
      p_is_blocked: false,
      p_verification_issues: verification.issues,
    })).catch(err => log.error({ err }, 'Failed to record query metrics'));

    // Track usage from Claude response
    const inputTokens = claudeResult.usage.inputTokens;
    const outputTokens = claudeResult.usage.outputTokens;
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost based on which model was used
    // Haiku: $0.80/$4.00 per 1M tokens (input/output)
    // Sonnet: $3.00/$15.00 per 1M tokens (input/output)
    const usedSonnet = selectedModel === 'sonnet';
    const costs = usedSonnet ? SONNET_COSTS : CLAUDE_COSTS;
    const costCents = Math.ceil(
      (inputTokens / 1_000_000) * costs.input * 100 +
      (outputTokens / 1_000_000) * costs.output * 100
    );

    // Record usage in database
    if (isAnonymous && anonymousFingerprint) {
      await recordAnonymousUsage(anonymousFingerprint, totalTokens);
    } else if (user) {
      await recordUsage(user.id, inputTokens, outputTokens, costCents);
    }

    log.info({
      totalTokens,
      inputTokens,
      outputTokens,
      costCents
    }, 'Recorded usage');

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Save messages to conversation (PREMIUM ONLY) - AWAIT to ensure completion
    let messagesSaved = false;
    if (isPremium && activeConversationId && user) {
      try {
        log.info({ conversationId: activeConversationId, isPremium, hasHistory: conversationHistory.length > 0 }, 'Starting to save conversation messages');

        // Save user message first
        const userMessage = await addMessage(activeConversationId, 'user', sanitizedMessage, 0, []);
        if (!userMessage) {
          log.error({ conversationId: activeConversationId }, 'Failed to save user message - addMessage returned null');
          // Don't continue if user message fails
          activeConversationId = undefined; // Don't return conversationId if save failed
        } else {
          log.debug({ conversationId: activeConversationId, messageId: userMessage.id }, 'Saved user message');

          // Save assistant response
          const assistantMessage = await addMessage(activeConversationId, 'assistant', response, totalTokens, citations);
          if (!assistantMessage) {
            log.error({ conversationId: activeConversationId }, 'Failed to save assistant message - addMessage returned null');
            activeConversationId = undefined; // Don't return conversationId if save failed
          } else {
            log.debug({ conversationId: activeConversationId, messageId: assistantMessage.id }, 'Saved assistant message');
            messagesSaved = true;

            // Auto-generate descriptive title from first message (only if this is a new conversation)
            if (conversationHistory.length === 0) {
              log.debug({ conversationId: activeConversationId }, 'Generating title for new conversation');
              const title = await autoGenerateTitle(activeConversationId);
              log.debug({ title, conversationId: activeConversationId }, 'Generated title');

              if (title && title !== 'New Conversation') {
                const updated = await updateConversationTitle(activeConversationId, user.id, title);
                log.info({ title, updated, conversationId: activeConversationId }, 'Updated conversation title');
              } else {
                log.warn({ title, conversationId: activeConversationId }, 'Title generation returned default or null');
              }
            }
          }
        }
      } catch (err) {
        log.error({ err, conversationId: activeConversationId }, 'Exception while saving conversation messages');
        activeConversationId = undefined; // Don't return conversationId if exception occurred
      }
    }

    // Log query for analytics (non-blocking) - only for authenticated users
    if (user) {
      logQuery({
        user_id: user.id,
        query_text: sanitizedMessage,
        response_text: response,
        tokens_used: totalTokens,
        response_time_ms: responseTime,
        has_results: true,
        num_citations: citations.length,
      }).catch(err => {
        log.error({ err }, 'Failed to log query analytics');
      });
    } else {
      // For anonymous users, just log to application logs (not user analytics)
      log.info({ isAnonymous: true, tokensUsed: totalTokens, responseTime }, 'Anonymous query completed');
    }

    log.info({ responseTime, conversationId: activeConversationId }, 'Request completed');

    // Build usage stats
    let usageStats;
    if (isAnonymous && anonymousSession) {
      // Refresh session to get updated usage
      const updatedSession = await getOrCreateAnonymousSession(anonymousFingerprint!);
      usageStats = {
        queriesUsed: (updatedSession?.queriesUsed || anonymousSession.queriesUsed) + 1,
        queriesRemaining: Math.max(0, (updatedSession?.queriesRemaining || anonymousSession.queriesRemaining) - 1),
        queryLimit: ANONYMOUS_QUERY_LIMIT,
        isAnonymous: true,
        // Legacy token fields for backwards compatibility
        tokensUsed: updatedSession?.tokensUsed || anonymousSession.tokensUsed + totalTokens,
        tokensRemaining: 0,
        monthlyLimit: ANONYMOUS_QUERY_LIMIT,
      };
    } else {
      usageStats = {
        tokensUsed: totalTokens,
        tokensRemaining: dashboard?.tokens_remaining || 0,
        monthlyLimit: dashboard?.monthly_token_limit || 50000,
        isAnonymous: false,
      };
    }

    // Cache successful responses for stateless queries (not follow-ups, not conversations)
    // This helps reduce API costs for common/repeated questions
    if (!isFollowUp && conversationHistory.length === 0 && verification.isValid) {
      setCachedChatResponse(sanitizedMessage, finalResponse, citations, claudeResult.model)
        .catch(err => log.error({ err }, 'Failed to cache chat response'));
    }

    // For follow-up questions, include previous citations so [1], [2] references still work
    // Merge previous citations with any new ones, avoiding duplicates
    let finalCitations = citations;
    if (isFollowUp && previousCitations.length > 0) {
      // Use previous citations if we have no new ones, otherwise merge
      if (citations.length === 0) {
        finalCitations = previousCitations.map((cite: any, idx: number) => ({
          ...cite,
          index: idx + 1, // Re-index for consistency
        }));
      } else {
        // Merge: new citations first, then previous ones that aren't duplicates
        const existingUrls = new Set(citations.map((c: any) => c.url || c.documentId));
        const uniquePrevious = previousCitations.filter(
          (c: any) => !existingUrls.has(c.url || c.documentId)
        );
        finalCitations = [...citations, ...uniquePrevious].map((cite: any, idx: number) => ({
          ...cite,
          index: idx + 1,
        }));
      }
      log.info({
        newCitations: citations.length,
        previousCitations: previousCitations.length,
        finalCitations: finalCitations.length
      }, 'Merged citations for follow-up response');
    }

    return NextResponse.json({
      response: finalResponse,
      citations: finalCitations,
      hasContext: true,
      conversationId: isPremium ? activeConversationId : undefined, // Only return conversationId for premium
      isPremium,
      isAnonymous,
      stats: {
        chunksRetrieved: results.length,
        avgSimilarity: results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100)
          : 0,
      },
      usage: usageStats,
      // Anti-hallucination metadata
      verification: {
        confidence: verification.confidence,
        isValid: verification.isValid,
        warnings: verification.warnings,
        details: verification.details,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Chat API error occurred');

    // Handle Claude API rate limit errors with a friendly message
    if (error instanceof ClaudeRateLimitError) {
      log.warn({ retryAfter: error.retryAfter }, 'Claude API rate limit hit');
      return NextResponse.json(
        {
          error: 'Service temporarily busy',
          message: 'Our AI service is experiencing high demand. Please wait a moment and try again.',
          retryAfter: error.retryAfter || 60,
        },
        {
          status: 503,
          headers: {
            'Retry-After': String(error.retryAfter || 60),
          },
        }
      );
    }

    // Capture error in Sentry
    captureException(error, {
      tags: {
        endpoint: '/api/chat',
        operation: 'chat-query',
      },
      extra: {
        message: body?.message,
        hasConversationHistory: conversationHistory?.length > 0,
      },
    });

    return NextResponse.json(
      {
        error: 'Failed to process your request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Enable streaming in the future if needed
export const runtime = 'nodejs';
