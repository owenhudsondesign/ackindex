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
    console.log('[Chat API] Cookie auth check failed:', error);
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
      console.log('[Chat API] Auth error:', error?.message);
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.log('[Chat API] Token validation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Declare variables outside try block so they're accessible in catch
  let body: any;
  let message: string | undefined;
  let conversationHistory: any[] = [];

  try {
    body = await request.json();
    message = body.message;
    conversationHistory = body.conversationHistory || [];

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Received query: "${message}"`);

    // Check if user is authenticated
    const user = await getUserFromRequest(request);
    if (!user) {
      console.log('[Chat API] No valid user found in request');
      return NextResponse.json(
        { error: 'Authentication required. Please sign up or log in to use the chatbot.' },
        { status: 401 }
      );
    }

    console.log(`[Chat API] Authenticated user: ${user.email} (${user.id})`);

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

    console.log(`[Chat API] User ${user.id} authorized to query`);

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
      minSimilarity: 0.7, // Back to original threshold
      includeDocumentInfo: true,
      searchMode: 'semantic',
    });

    console.log(`[Chat API] Retrieved ${rawResults.length} relevant chunks`);
    
    // Debug: Log raw results details
    if (rawResults.length > 0) {
      console.log(`[Chat API] Raw results details:`);
      rawResults.forEach((result, i) => {
        console.log(`  Result ${i + 1}: similarity=${result.similarity}, content_length=${result.content?.length || 0}`);
      });
    } else {
      console.log(`[Chat API] No raw results found - this is the problem!`);
    }

    // Step 2: Deduplicate results to avoid duplicate sources
    const results = deduplicateResults(rawResults, 0.9); // Remove very similar content
    console.log(`[Chat API] After deduplication: ${results.length} unique chunks`);
    
    // Debug: Log the results
    if (results.length > 0) {
      console.log(`[Chat API] Top result similarity: ${results[0].similarity}`);
      console.log(`[Chat API] Top result content preview: ${results[0].content.substring(0, 200)}...`);
    }

    // Step 3: Check if we have relevant information
    const hasRelevant = hasRelevantResults(results, 0.7);
    console.log(`[Chat API] Has relevant results: ${hasRelevant}`);
    
    if (!hasRelevant) {
      console.log('[Chat API] No relevant information found');
      return NextResponse.json({
        response: "I don't have enough information in my database to answer that question. I can only provide information about content that has been uploaded to AckIndex. Please try asking about topics covered in the uploaded documents, or consider uploading more relevant content.",
        citations: [],
        hasContext: false,
      });
    }

    // Step 4: Build context from retrieved chunks
    const context = buildContext(results);
    const citations = extractCitations(results);

    console.log(`[Chat API] Built context with ${citations.length} sources`);
    console.log(`[Chat API] Context preview: ${context.substring(0, 300)}...`);
    
    // Debug: Log detailed results info
    console.log(`[Chat API] Results details:`);
    results.forEach((result, i) => {
      console.log(`  Result ${i + 1}:`);
      console.log(`    - Similarity: ${result.similarity}`);
      console.log(`    - Content length: ${result.content?.length || 0}`);
      console.log(`    - Document title: ${result.document?.title || 'No title'}`);
      console.log(`    - Content preview: ${result.content?.substring(0, 100) || 'No content'}...`);
    });

    // Step 4: Generate response with LLM using secure system prompt
    const systemPrompt = createSecureSystemPrompt(context);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4), // Include last 4 messages for context
      { role: 'user', content: sanitizedMessage },
    ];

    // Debug: Log the full system prompt being sent to LLM
    console.log(`[Chat API] System prompt length: ${systemPrompt.length} characters`);
    console.log(`[Chat API] System prompt preview: ${systemPrompt.substring(0, 500)}...`);
    console.log(`[Chat API] Context length: ${context.length} characters`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3, // Low temperature for more factual responses
      max_tokens: 500,
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

    // Debug: Log the full LLM response
    console.log(`[Chat API] LLM response: "${response}"`);
    console.log(`[Chat API] Response length: ${response.length} characters`);
    console.log(`[Chat API] Generated response successfully`);

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

    console.log(`[Chat API] Recorded usage: ${totalTokens} tokens for user ${user.id}`);

    // Get updated usage stats
    const dashboard = await getUserDashboard(user.id);

    return NextResponse.json({
      response,
      citations,
      hasContext: true,
      stats: {
        chunksRetrieved: results.length,
        avgSimilarity: Math.round(
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100
        ),
      },
      usage: {
        tokensUsed: totalTokens,
        tokensRemaining: dashboard?.tokens_remaining || 0,
        monthlyLimit: dashboard?.monthly_token_limit || 3500,
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

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
