import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retrieveRelevantChunks, buildContext, extractCitations, hasRelevantResults } from '@/lib/retrieval';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Received query: "${message}"`);

    // Step 1: Retrieve relevant chunks
    const results = await retrieveRelevantChunks(message, {
      maxResults: 5,
      minSimilarity: 0.7,
      includeDocumentInfo: true,
      searchMode: 'semantic',
    });

    console.log(`[Chat API] Retrieved ${results.length} relevant chunks`);

    // Step 2: Check if we have relevant information
    if (!hasRelevantResults(results, 0.7)) {
      console.log('[Chat API] No relevant information found');
      return NextResponse.json({
        response: "I don't have enough information in my database to answer that question. I can only provide information about content that has been uploaded to AckIndex. Please try asking about topics covered in the uploaded documents, or consider uploading more relevant content.",
        citations: [],
        hasContext: false,
      });
    }

    // Step 3: Build context from retrieved chunks
    const context = buildContext(results);
    const citations = extractCitations(results);

    console.log(`[Chat API] Built context with ${citations.length} sources`);

    // Step 4: Generate response with LLM
    const systemPrompt = `You are AckIndex, a helpful AI assistant for the Town of Nantucket. Your role is to answer questions based ONLY on the provided context from official town documents, permits, and records.

CRITICAL RULES:
1. ONLY use information from the provided context
2. If the context doesn't contain the answer, say "I don't have that information in my database"
3. ALWAYS cite your sources using [Source N] notation
4. Be concise and direct
5. If asked about current events or things not in the context, politely explain you only have access to uploaded documents
6. Focus on civic information: permits, regulations, town meetings, etc.

Context from documents:
${context}

Remember: Your knowledge is limited to the context above. Do not make up information or use outside knowledge.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4), // Include last 4 messages for context
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3, // Low temperature for more factual responses
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.';

    console.log('[Chat API] Generated response successfully');

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
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
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
