import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || question.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please ask a more specific question' },
        { status: 400 }
      );
    }

    console.log('Question received:', question);

    // Get relevant civic documents from database
    const { data: entries, error: dbError } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch civic data' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        text: "I don't have enough civic data yet to answer that question. Please upload some documents first!",
        sources: [],
        confidence: 'low'
      });
    }

    // Build context from civic entries
    const context = entries.map((entry, idx) => {
      const metrics = entry.key_metrics ? entry.key_metrics.map((m: any) =>
        `${m.label}: ${m.value}${m.change_pct ? ` (${m.change_pct > 0 ? '+' : ''}${m.change_pct}% change)` : ''}`
      ).join(', ') : '';

      const insights = entry.insights ? entry.insights.map((i: any) =>
        `${i.title}: ${i.description}`
      ).join('; ') : '';

      return `[Document ${idx + 1}]
Title: ${entry.title}
Category: ${entry.category}
Source: ${entry.source}
Date: ${entry.date_published || entry.created_at}
Summary: ${entry.summary.slice(0, 400)}
Key Metrics: ${metrics}
Insights: ${insights}`;
    }).join('\n\n---\n\n');

    // Use Claude to answer the question
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback to OpenAI if Anthropic key not available
      return await answerWithOpenAI(question, context, entries);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        system: `You are a civic data analyst for Nantucket, Massachusetts. Your job is to help citizens understand their town government by answering questions based ONLY on the civic documents provided.

CRITICAL RULES:
1. Answer ONLY using data from the provided documents
2. Be specific - cite actual numbers, percentages, and dollar amounts
3. Explain clearly in plain English - no jargon
4. If you don't have the data to answer, say so honestly
5. Provide context: Is this high? Low? Growing? Shrinking?
6. Make it relevant to citizens: What does this mean for them?

Answer format:
- Start with a direct answer to their question
- Provide specific numbers and facts
- Add context and comparisons
- Explain what it means for citizens
- Keep it under 300 words`,
        messages: [{
          role: 'user',
          content: `Question from a Nantucket citizen: ${question}

Available Civic Data:
${context}

Please answer their question using this data. Be specific, cite numbers, and explain clearly.`
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      // Fallback to OpenAI
      return await answerWithOpenAI(question, context, entries);
    }

    const data = await response.json();
    const answerText = data.content[0].text;

    // Determine which documents were most relevant
    const sources = entries
      .slice(0, 3)
      .map(e => e.title);

    return NextResponse.json({
      text: answerText,
      sources,
      confidence: 'high'
    });

  } catch (error: any) {
    console.error('Ask API error:', error);
    return NextResponse.json(
      {
        text: 'Sorry, I encountered an error trying to answer your question. Please try again.',
        sources: [],
        confidence: 'low',
        error: error.message
      },
      { status: 500 }
    );
  }
}

async function answerWithOpenAI(question: string, context: string, entries: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API keys configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are a civic data analyst for Nantucket. Answer questions using ONLY the provided civic documents. Be specific, cite numbers, explain clearly in plain English.`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nCivic Data:\n${context}\n\nAnswer this question specifically using the data provided.`
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API failed');
  }

  const data = await response.json();
  const answerText = data.choices[0].message.content;

  return NextResponse.json({
    text: answerText,
    sources: entries.slice(0, 3).map(e => e.title),
    confidence: 'medium'
  });
}
