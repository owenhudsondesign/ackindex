import { ParsedCivicData } from '@/types';

const CIVIC_PARSING_SYSTEM_PROMPT = `You are a civic data parser for AckIndex — Nantucket's civic intelligence dashboard. Your job is to extract key facts, numbers, summaries, and insights from town government documents (budgets, real estate reports, meeting minutes, infrastructure updates, etc.). You will return structured JSON ready for a public-facing web dashboard.

Be factual, concise, and neutral. Avoid speculation, political bias, or filler language. Capture only information that provides civic or financial insight.

Always return valid JSON (UTF-8, no comments, no markdown).`;

const PARSING_INSTRUCTION = `Extract structured data from this document and return ONLY valid JSON with this exact structure:

{
  "title": "string — concise headline-style summary of document",
  "source": "string — name of issuing department or organization",
  "category": "string — one of: Budget | Real Estate | Town Meeting | Infrastructure | General",
  "summary": "string — 2 short paragraphs (400 words max total) summarizing key points",
  "key_metrics": [
    {
      "label": "string — short name of the metric (e.g. 'Total Budget')",
      "value": "string — formatted number or percentage (e.g. '$128M' or '5.2% increase')"
    }
  ],
  "visualizations": [
    {
      "type": "string — one of: bar | line | pie | donut | timeline | table",
      "labels": ["array of string — x-axis labels or categories"],
      "values": ["array of number — corresponding values"]
    }
  ],
  "notable_updates": [
    "string — brief notable changes, decisions, or project statuses (optional)"
  ],
  "date_published": "string — if found, in YYYY-MM-DD format, else null",
  "document_excerpt": "string — short quoted excerpt or section title (optional)"
}`;

export async function parseDocumentWithClaude(
  documentText: string,
  userProvidedData: { title?: string; category?: string; source?: string }
): Promise<ParsedCivicData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const userContext = `
User-provided context:
${userProvidedData.title ? `Title: ${userProvidedData.title}` : ''}
${userProvidedData.category ? `Category: ${userProvidedData.category}` : ''}
${userProvidedData.source ? `Source: ${userProvidedData.source}` : ''}

Document text:
${documentText.slice(0, 50000)}
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.2,
      system: CIVIC_PARSING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${PARSING_INSTRUCTION}\n\n${userContext}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Extract JSON from response (handle potential markdown code blocks)
  let jsonText = content;
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  const parsedData: ParsedCivicData = JSON.parse(jsonText);
  
  // Override with user-provided data if available
  if (userProvidedData.title) parsedData.title = userProvidedData.title;
  if (userProvidedData.category) parsedData.category = userProvidedData.category as any;
  if (userProvidedData.source) parsedData.source = userProvidedData.source;
  
  return parsedData;
}

// Alternative: OpenAI GPT-4 implementation
export async function parseDocumentWithOpenAI(
  documentText: string,
  userProvidedData: { title?: string; category?: string; source?: string }
): Promise<ParsedCivicData> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const userContext = `
User-provided context:
${userProvidedData.title ? `Title: ${userProvidedData.title}` : ''}
${userProvidedData.category ? `Category: ${userProvidedData.category}` : ''}
${userProvidedData.source ? `Source: ${userProvidedData.source}` : ''}

Document text:
${documentText.slice(0, 50000)}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: CIVIC_PARSING_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `${PARSING_INSTRUCTION}\n\n${userContext}`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const parsedData: ParsedCivicData = JSON.parse(data.choices[0].message.content);
  
  // Override with user-provided data if available
  if (userProvidedData.title) parsedData.title = userProvidedData.title;
  if (userProvidedData.category) parsedData.category = userProvidedData.category as any;
  if (userProvidedData.source) parsedData.source = userProvidedData.source;
  
  return parsedData;
}
