import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParsedFilename {
  meetingTitle: string;
  meetingDate: string; // YYYY-MM-DD format
  boardOrCommittee: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function POST(request: NextRequest) {
  try {
    const { filenames } = await request.json();

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json({ error: 'Missing filenames array' }, { status: 400 });
    }

    // Batch process up to 20 filenames at once
    const batch = filenames.slice(0, 20);

    const prompt = `Parse these video filenames and extract meeting information. These are recordings of government meetings (town boards, committees, etc.) from Nantucket, Massachusetts.

For each filename, extract:
1. meetingTitle: Full official name (e.g., "Select Board Meeting - November 13, 2025")
2. meetingDate: In YYYY-MM-DD format
3. boardOrCommittee: Just the board/committee name (e.g., "Select Board", "Planning Board", "Zoning Board of Appeals")
4. confidence: "high" if date and board are clear, "medium" if somewhat ambiguous, "low" if guessing

Common boards include: Select Board, Planning Board, Zoning Board of Appeals, Finance Committee, Conservation Commission, Historic District Commission, Board of Health, School Committee, Airport Commission, Sewer Commission, etc.

Filenames to parse:
${batch.map((f, i) => `${i + 1}. "${f}"`).join('\n')}

Respond with a JSON array of objects, one per filename, in the same order. Use null for meetingDate if you can't determine it.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses video filenames into structured meeting metadata. Always respond with valid JSON only, no markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
      // Handle both { results: [...] } and direct array format
      const results = parsed.results || parsed.parsed || parsed;

      if (!Array.isArray(results)) {
        throw new Error('Response is not an array');
      }

      return NextResponse.json({ parsed: results });
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      throw new Error('Failed to parse LLM response');
    }
  } catch (error) {
    console.error('Parse filename error:', error);
    return NextResponse.json({ error: 'Failed to parse filenames' }, { status: 500 });
  }
}
