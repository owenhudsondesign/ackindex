/**
 * Social Media Post Generator
 *
 * Automatically generates Instagram and Facebook posts from town meeting transcripts
 * after video ingestion completes.
 */

import { supabaseAdmin } from './supabase';
import { openai } from './openai';
import logger from './logger';

const log = logger.child({ module: 'socialMediaGenerator' });

interface SocialMediaPost {
  platform: 'instagram' | 'facebook';
  content: string;
  hashtags: string[];
  characterCount: number;
}

interface SocialMediaPostsData {
  instagramPost: SocialMediaPost;
  facebookPost: SocialMediaPost;
}

/**
 * Generate Instagram and Facebook posts from meeting transcript
 */
async function generateSocialMediaContent(
  documentTitle: string,
  transcriptChunks: string[],
  meetingType: string | null,
  meetingDate: Date | null
): Promise<SocialMediaPostsData> {
  // Sample transcript (use first 8 chunks, ~4000 tokens)
  const sampleTranscript = transcriptChunks.slice(0, 8).join('\n\n');

  const meetingDateStr = meetingDate
    ? meetingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent';

  const meetingTypeStr = meetingType || 'Town Meeting';

  const prompt = `You are writing social media posts summarizing a Nantucket town meeting for AckIndex.com.

Meeting: ${documentTitle}
Type: ${meetingTypeStr}
Date: ${meetingDateStr}

Transcript Sample:
${sampleTranscript}

Create TWO social media posts:

1. INSTAGRAM POST (2200 characters max):
   - Engaging hook in first line
   - 3-5 key highlights with emojis
   - Call-to-action to search AckIndex.com
   - 10-15 relevant hashtags
   - Conversational but professional tone

2. FACEBOOK POST (1500 characters max):
   - Professional summary
   - Key decisions and votes
   - Direct quotes from officials
   - Link to AckIndex.com
   - 5-8 relevant hashtags
   - More formal tone than Instagram

Include relevant hashtags like #Nantucket, #TownMeeting, #LocalGovernment, plus topic-specific tags.

Provide response in JSON format:
{
  "instagram": {
    "content": "Full Instagram post with emojis",
    "hashtags": ["Nantucket", "TownMeeting", "LocalGov", ...]
  },
  "facebook": {
    "content": "Full Facebook post",
    "hashtags": ["Nantucket", "TownMeeting", ...]
  }
}

Focus on engaging content that makes civic information accessible and interesting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a social media manager for AckIndex, making Nantucket town meetings engaging and accessible. Your posts are informative, conversational, and optimized for each platform.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Slightly higher for more creative/engaging content
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate response
    if (!result.instagram?.content || !result.facebook?.content) {
      throw new Error('Incomplete social media post generation response');
    }

    return {
      instagramPost: {
        platform: 'instagram',
        content: result.instagram.content.slice(0, 2200), // Instagram limit
        hashtags: (result.instagram.hashtags || []).slice(0, 30), // Instagram max 30
        characterCount: result.instagram.content.length,
      },
      facebookPost: {
        platform: 'facebook',
        content: result.facebook.content.slice(0, 63206), // Facebook limit (very high)
        hashtags: (result.facebook.hashtags || []).slice(0, 10),
        characterCount: result.facebook.content.length,
      },
    };
  } catch (error) {
    log.error({ error, documentTitle }, 'Failed to generate social media content with OpenAI');
    throw error;
  }
}

/**
 * Extract meeting type and date from document title
 */
function extractMeetingInfo(title: string): { meetingType: string | null; meetingDate: Date | null } {
  let meetingType: string | null = null;
  let meetingDate: Date | null = null;

  // Extract meeting type
  const typePatterns = [
    /select board/i,
    /planning board/i,
    /town council/i,
    /public hearing/i,
    /special town meeting/i,
    /annual town meeting/i,
    /zoning board/i,
    /board of selectmen/i,
  ];

  for (const pattern of typePatterns) {
    if (pattern.test(title)) {
      meetingType = title.match(pattern)?.[0] || null;
      if (meetingType) {
        meetingType = meetingType
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
      break;
    }
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = title.match(pattern);
    if (match) {
      try {
        if (pattern.source.includes('january|february')) {
          meetingDate = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
        } else if (pattern.source.includes('\\d{4}-')) {
          meetingDate = new Date(match[0]);
        } else {
          meetingDate = new Date(`${match[3]}-${match[1]}-${match[2]}`);
        }

        if (isNaN(meetingDate.getTime())) {
          meetingDate = null;
        }
      } catch {
        meetingDate = null;
      }
      break;
    }
  }

  return { meetingType, meetingDate };
}

/**
 * Create social media posts for a completed document
 *
 * @param documentId - The document ID of the completed meeting
 * @returns Object with Instagram and Facebook post content, or null if generation failed
 */
export async function createSocialMediaPostsForDocument(
  documentId: string
): Promise<SocialMediaPostsData | null> {
  try {
    log.info({ documentId }, 'Starting social media post generation');

    // 1. Fetch document details
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, status')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      log.error({ error: docError, documentId }, 'Document not found');
      return null;
    }

    if (document.status !== 'completed') {
      log.warn({ documentId, status: document.status }, 'Document not completed, skipping social media generation');
      return null;
    }

    // 2. Fetch transcript chunks (ordered by chunk_index)
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })
      .limit(15); // Get first 15 chunks for context

    if (chunksError || !chunks || chunks.length === 0) {
      log.error({ error: chunksError, documentId }, 'Failed to fetch document chunks');
      return null;
    }

    const transcriptChunks = chunks.map(c => c.content);

    // 3. Extract meeting metadata
    const { meetingType, meetingDate } = extractMeetingInfo(document.title);

    // 4. Generate social media posts with OpenAI
    const socialMediaData = await generateSocialMediaContent(
      document.title,
      transcriptChunks,
      meetingType,
      meetingDate
    );

    log.info(
      {
        documentId,
        instagramChars: socialMediaData.instagramPost.characterCount,
        facebookChars: socialMediaData.facebookPost.characterCount,
      },
      'Social media posts generated successfully'
    );

    return socialMediaData;
  } catch (error) {
    log.error({ error, documentId }, 'Social media post generation failed');
    return null;
  }
}

/**
 * Save social media posts to a file for the admin to review/post
 * (We're not auto-posting to actual social media accounts)
 */
export async function saveSocialMediaPostsForDocument(
  documentId: string
): Promise<string | null> {
  const postsData = await createSocialMediaPostsForDocument(documentId);

  if (!postsData) {
    return null;
  }

  // Store in database as JSON for admin to access later
  const { data: document } = await supabaseAdmin
    .from('documents')
    .select('title')
    .eq('id', documentId)
    .single();

  const { data, error } = await supabaseAdmin
    .from('documents')
    .update({
      metadata: {
        social_media_posts: {
          instagram: {
            content: postsData.instagramPost.content,
            hashtags: postsData.instagramPost.hashtags,
          },
          facebook: {
            content: postsData.facebookPost.content,
            hashtags: postsData.facebookPost.hashtags,
          },
          generated_at: new Date().toISOString(),
        },
      },
    } as any)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    log.error({ error, documentId }, 'Failed to save social media posts');
    return null;
  }

  log.info({ documentId }, 'Social media posts saved to document metadata');
  return documentId;
}
