import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retrieveRelevantChunks, buildContext, extractCitations, hasRelevantResults, deduplicateResults } from '@/lib/retrieval';
import { canUserQuery, recordUsage, getUserDashboard } from '@/lib/userProfile';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { captureException, setUserContext } from '@/lib/sentry';
import { validateUserInput, createSecureSystemPrompt, validateAIResponse } from '@/lib/promptSecurity';
import logger from '@/lib/logger';
import { logQuery } from '@/lib/analytics';
import { createConversation, addMessage, getRecentMessages, autoGenerateTitle, updateConversationTitle } from '@/lib/conversations';

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

    // Check if user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      log.warn('Unauthenticated chat request');
      return NextResponse.json(
        { error: 'Authentication required. Please sign up or log in to use the chatbot.' },
        { status: 401 }
      );
    }

    // Add user context to logger
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

    // Step 0: Handle conversation (PREMIUM ONLY FEATURE)
    let activeConversationId = conversationId;
    conversationHistory = [];

    // Get user's subscription tier
    const dashboard = await getUserDashboard(user.id);
    const isPremium = dashboard?.subscription_tier === 'premium';

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

    // Step 1: Validate and sanitize user input (prevent prompt injection)
    const validation = validateUserInput(message, user.id);

    if (!validation.isValid || validation.blocked) {
      logger.warn(
        { userId: user.id, reason: validation.reason, warnings: validation.warnings },
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
      logger.info({ userId: user.id, warnings: validation.warnings }, 'Suspicious input patterns detected');
    }

    // Use sanitized input for the rest of the processing
    const sanitizedMessage = validation.sanitizedInput;

    // Step 2: Retrieve relevant chunks
    const rawResults = await retrieveRelevantChunks(sanitizedMessage, {
      maxResults: 10, // Get more results to deduplicate
      minSimilarity: 0.75, // Stricter threshold to avoid irrelevant results
      includeDocumentInfo: true,
      searchMode: 'semantic',
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
    const hasRelevant = hasRelevantResults(results, 0.78); // Higher threshold for stricter relevance
    log.info({ hasRelevant }, 'Checked relevance of results');

    if (!hasRelevant) {
      log.info('No relevant information found for query');

      // Log query with no results for analytics
      const responseTime = Date.now() - startTime;
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

      return NextResponse.json({
        response: "I don't have enough information in my database to answer that question. I can only provide information about content that has been uploaded to AckIndex. Please try asking about topics covered in the uploaded documents, or consider uploading more relevant content.",
        citations: [],
        hasContext: false,
      });
    }

    // Step 4: Build context from retrieved chunks
    const context = buildContext(results);
    const citations = extractCitations(results);

    log.info({
      citationsCount: citations.length,
      contextLength: context.length
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
      logger.error({ userId: user.id }, 'AI response contained system prompt leak');
      captureException(new Error('AI response validation failed'), {
        tags: { endpoint: '/api/chat', issue: 'prompt-leak' },
        extra: { userId: user.id },
      });
    }

    const response = responseValidation.sanitizedResponse;

    // Log LLM response details
    log.info({
      responseLength: response.length,
      responseValid: responseValidation.isValid
    }, 'Generated LLM response successfully');

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
    await recordUsage(user.id, inputTokens, outputTokens, costCents);

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
    if (isPremium && activeConversationId) {
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

    // Log query for analytics (non-blocking)
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

    log.info({ responseTime, conversationId: activeConversationId }, 'Request completed');

    return NextResponse.json({
      response,
      citations,
      hasContext: true,
      conversationId: isPremium ? activeConversationId : undefined, // Only return conversationId for premium
      isPremium,
      stats: {
        chunksRetrieved: results.length,
        avgSimilarity: Math.round(
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100
        ),
      },
      usage: {
        tokensUsed: totalTokens,
        tokensRemaining: dashboard?.tokens_remaining || 0,
        monthlyLimit: dashboard?.monthly_token_limit || 15000,
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
