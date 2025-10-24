import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface ChatRequest {
  messages: Message[];
}

export async function POST(request: NextRequest) {
  try {
    const { messages }: ChatRequest = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Get the latest user message
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    const question = latestUserMessage.content;

    // Fetch all civic entries for context
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: entries, error: dbError } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        answer: "I don't have any civic data available yet. Please upload some documents first.",
        sources: [],
      });
    }

    // Build context from conversation history
    const conversationContext = messages
      .slice(0, -1) // Exclude the latest message
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // Build civic data context
    const civicContext = entries
      .map((entry) => {
        let context = `Document: ${entry.title}\n`;
        context += `Category: ${entry.category}\n`;
        context += `Source: ${entry.source}\n`;
        context += `Summary: ${entry.summary}\n`;

        if (entry.key_metrics && entry.key_metrics.length > 0) {
          context += `Key Metrics:\n`;
          entry.key_metrics.forEach((metric: any) => {
            context += `- ${metric.label}: ${metric.value}`;
            if (metric.trend) context += ` (${metric.trend})`;
            if (metric.change_pct) context += ` ${metric.change_pct}% change`;
            context += '\n';
          });
        }

        if (entry.insights && entry.insights.length > 0) {
          context += `Key Insights:\n`;
          entry.insights.forEach((insight: any) => {
            context += `- [${insight.type.toUpperCase()}] ${insight.title}: ${insight.description}\n`;
          });
        }

        if (entry.plain_english_summary && entry.plain_english_summary.length > 0) {
          context += `What This Means:\n`;
          entry.plain_english_summary.forEach((point: string) => {
            context += `- ${point}\n`;
          });
        }

        return context;
      })
      .join('\n---\n\n');

    const systemPrompt = `You are AckIndex AI, a conversational assistant that helps Nantucket citizens understand their town government.

You have access to civic documents including budgets, real estate reports, meeting minutes, and infrastructure updates.

Your role:
- Answer questions clearly and directly in plain English
- Use specific numbers and facts from the documents
- Maintain conversation context from previous messages
- Cite your sources (document titles)
- If you don't know, say so honestly
- Be concise but thorough
- Focus on what matters to citizens

Conversation History:
${conversationContext || 'No previous conversation'}

Available Civic Data:
${civicContext}`;

    const userPrompt = `Question: ${question}

Please provide a clear, conversational answer based on the available civic data. If referencing specific information, mention which document it comes from.`;

    // Try Claude API first
    let answer = '';
    let sources: string[] = [];

    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
      }

      const data = await response.json();
      answer = data.content[0].text;

      // Extract sources from the answer
      sources = entries
        .filter((entry) =>
          answer.toLowerCase().includes(entry.title.toLowerCase()) ||
          answer.toLowerCase().includes(entry.category.toLowerCase())
        )
        .map((entry) => entry.title)
        .slice(0, 3); // Limit to 3 sources

    } catch (claudeError) {
      console.error('Claude API failed, trying OpenAI:', claudeError);

      // Fallback to OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('No AI API keys configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      answer = data.choices[0].message.content;

      // Extract sources from the answer
      sources = entries
        .filter((entry) =>
          answer.toLowerCase().includes(entry.title.toLowerCase()) ||
          answer.toLowerCase().includes(entry.category.toLowerCase())
        )
        .map((entry) => entry.title)
        .slice(0, 3);
    }

    return NextResponse.json({
      answer,
      sources,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
