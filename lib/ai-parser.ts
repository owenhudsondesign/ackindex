import { ParsedCivicData } from '@/types';

const CIVIC_PARSING_SYSTEM_PROMPT = `You are a civic data parser for AckIndex — Nantucket's civic intelligence dashboard. Your job is to extract key facts, numbers, summaries, and insights from town government documents (budgets, real estate reports, meeting minutes, infrastructure updates, etc.). You will return structured JSON ready for a public-facing web dashboard.

Be factual, concise, and neutral. Avoid speculation, political bias, or filler language. Capture only information that provides civic or financial insight.

Always return valid JSON (UTF-8, no comments, no markdown).`;

const PARSING_INSTRUCTION = `Extract structured data from this document and return ONLY valid JSON with this exact structure.

CRITICAL ANALYSIS REQUIREMENTS:
1. IDENTIFY TRENDS - Calculate year-over-year changes, growth rates, and patterns
2. FLAG CONCERNS - Expenses growing >10% annually, declining revenues, budget issues
3. FIND INSIGHTS - What's the story? What should citizens know? What's notable?
4. COMPARE CATEGORIES - Which areas growing fastest/slowest? What's changing?
5. CALCULATE RATIOS - Per capita costs, percentages of total, relative comparisons

Return this JSON structure:
{
  "title": "string — concise headline-style summary of document",
  "source": "string — name of issuing department or organization",
  "category": "string — one of: Budget | Real Estate | Town Meeting | Infrastructure | General",
  "summary": "string — 2 short paragraphs (400 words max total) - MUST INCLUDE key insights like 'Healthcare costs up 59%' or 'Fastest growth in 10 years'",

  "key_metrics": [
    {
      "label": "string — short name of the metric (e.g. 'Total Budget')",
      "value": "string — formatted number or percentage (e.g. '$128M' or '5.2% increase')",
      "trend": "string — one of: up | down | stable (based on historical context)",
      "change_pct": "number — percentage change from previous period (if available)"
    }
  ],

  "visualizations": [
    {
      "type": "string — one of: bar | line | pie | donut | timeline | table",
      "title": "string — descriptive title for the chart (e.g. 'Healthcare Cost Growth 2013-2018')",
      "labels": ["array of string — x-axis labels or categories"],
      "values": ["array of number — corresponding values"],
      "insight": "string — what does this chart reveal? The story behind the numbers",
      "highlight_index": "number — which data point is most significant? (0-based index, optional)"
    }
  ],

  "insights": [
    {
      "type": "string — one of: concern | success | neutral",
      "title": "string — attention-grabbing headline (e.g. 'Healthcare Costs Soaring')",
      "description": "string — detailed explanation with specific numbers and context",
      "impact": "string — one of: high | medium | low"
    }
  ],

  "comparisons": [
    {
      "title": "string — comparison headline (e.g. 'School vs Town Salary Growth')",
      "category_a": "string — first category name",
      "value_a": "string — formatted value for first category",
      "category_b": "string — second category name",
      "value_b": "string — formatted value for second category",
      "winner": "string — explanation of which is higher/better and by how much"
    }
  ],

  "notable_updates": [
    "string — brief notable changes, decisions, or project statuses"
  ],
  "date_published": "string — if found, in YYYY-MM-DD format, else null",
  "document_excerpt": "string — short quoted excerpt or section title (optional)",

  "plain_english_summary": [
    "string — Plain English bullet points explaining what this means for citizens",
    "Example: 'Your property taxes will likely increase 3.5% next year'",
    "Example: 'Healthcare costs are the main driver - up 59% in 5 years'",
    "Example: 'Good news: Debt payments going down, freeing up $1.5M'"
  ]
}

EXAMPLES OF GOOD INSIGHTS:
- "Healthcare costs projected to increase 59% over 5 years ($7.6M to $12.1M) - fastest growing budget item"
- "Debt service declining from 12.9% to 9.2% of budget, freeing up $1.5M annually"
- "School salaries growing 46% faster than town salaries (10.8% vs 7.4%)"

Extract ALL available insights, trends, and comparisons - citizens need this context!`;

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
