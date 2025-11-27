import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retrieveRelevantChunks, buildContext, extractCitations, hasRelevantResults, deduplicateResults, isRecencyQuery } from '@/lib/retrieval';
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

  // Look for proper nouns (capitalized sequences of 2+ words)
  const properNouns = combinedPrevious.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
  if (properNouns) {
    topics.push(...properNouns.slice(0, 2));
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
  const uniqueTopics = [...new Set(topics)].slice(0, 2);
  if (uniqueTopics.length > 0) {
    const context = uniqueTopics.join(' and ');
    return `${query} (regarding ${context})`;
  }

  return query;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const { data: { session } } = await supabaseSSR.auth.getSession();

    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
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
        // Free users: stateless queries (no conversation history)
        log.info('Free user - stateless query mode');
      }
    } else {
      // Anonymous users: stateless queries (no conversation history)
      log.info('Anonymous user - stateless query mode');
    }

    // Resolve follow-up queries using conversation context (premium users only)
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

    // Step 2: Retrieve relevant chunks using hybrid search
    // Hybrid combines semantic (vector) + keyword (text) search for better recall
    // This helps with specific terms like legal codes (e.g., "4181L") that semantic alone might miss
    // Use lower similarity for recency queries since they have naturally lower semantic similarity
    const isRecencySearch = isRecencyQuery(sanitizedMessage);
    const rawResults = await retrieveRelevantChunks(sanitizedMessage, {
      maxResults: 15, // Fetch enough chunks to cover multiple relevant documents
      minSimilarity: isRecencySearch ? 0.60 : 0.75, // Lower threshold for recency queries
      includeDocumentInfo: true,
      searchMode: 'hybrid',
    });

    log.info({ rawResultsCount: rawResults.length }, 'Retrieved relevant chunks');

    // Debug: Log raw results details
    if (rawResults.length > 0) {
      log.debug({
        topSimilarity: rawResults[0]?.similarity,
        avgSimilarity: rawResults.reduce((sum, r) => sum + r.similarity, 0) / rawResults.length
      }, 'Raw results details');
    } else {
      log.warn('No raw results found from vector search');
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
    // Use lower threshold for recency/broad queries since they have naturally lower semantic similarity
    const isRecent = isRecencyQuery(sanitizedMessage);
    const similarityThreshold = isRecent ? 0.65 : 0.78;
    const hasRelevant = hasRelevantResults(results, similarityThreshold);
    log.info({ hasRelevant, topSimilarity: results[0]?.similarity, isRecent, threshold: similarityThreshold }, 'Checked relevance of results');

    if (!hasRelevant) {
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

    // Step 4: Build context from retrieved chunks
    let context = buildContext(results);
    const citations = await extractCitations(results);

    // Add previous assistant message citations to context for follow-up questions
    const previousCitations = conversationHistory
      .filter((m: any) => m.role === 'assistant' && m.citations && m.citations.length > 0)
      .slice(-2) // Get last 2 assistant messages
      .flatMap((m: any) => m.citations);

    if (previousCitations.length > 0) {
      const previousContext = previousCitations
        .map((cite: any, idx: number) => `[Previous Source ${idx + 1}] ${cite.title}: ${cite.snippet || ''}`)
        .join('\n\n');

      context = `${context}\n\n--- Previous Sources from Conversation History ---\n${previousContext}`;

      log.info({
        previousCitationsCount: previousCitations.length
      }, 'Added previous citations to context for follow-up');
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

    // Step 4: Generate response with LLM using secure system prompt
    const systemPrompt = createSecureSystemPrompt(context);

    // Map conversation history to valid OpenAI message params and drop legacy roles
    const mappedHistory: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory
      .slice(-6)
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...mappedHistory, // Include last 6 messages for context (3 turns)
      { role: 'user', content: sanitizedMessage },
    ];

    // Debug: Log system prompt details
    log.debug({
      systemPromptLength: systemPrompt.length,
      contextLength: context.length
    }, 'Sending query to LLM');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3, // Low temperature for more factual responses
      max_tokens: 800, // Increased from 500 to allow for specific, detailed answers with quotes
    });

    const rawResponse = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.';

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

    // Block response if verification fails critical checks
    if (shouldBlockResponse(verification)) {
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

    // Track usage
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || 0;

    // Calculate cost (approximate)
    // GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    const costCents = Math.ceil(
      (inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 60
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

    return NextResponse.json({
      response,
      citations,
      hasContext: true,
      conversationId: isPremium ? activeConversationId : undefined, // Only return conversationId for premium
      isPremium,
      isAnonymous,
      stats: {
        chunksRetrieved: results.length,
        avgSimilarity: Math.round(
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100
        ),
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
