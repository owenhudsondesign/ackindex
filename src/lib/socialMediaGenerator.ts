/**
 * Social Media Post Generator
 *
 * Generates platform-specific social media posts for blog articles
 * using AI to create engaging summaries with appropriate formatting.
 */

import { claudeComplete } from './anthropic';
import logger from './logger';

const log = logger.child({ module: 'socialMediaGenerator' });

export interface SocialMediaPosts {
  facebook: {
    text: string;
    hashtags: string[];
  };
  instagram: {
    caption: string;
    hashtags: string[];
  };
}

export interface BlogPostData {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  meeting_type: string | null;
  meeting_date: string | null;
  thumbnail_url: string | null;
  keywords: string[];
}

/**
 * Generate social media posts for a blog article
 */
export async function generateSocialMediaPosts(
  blogPost: BlogPostData,
  siteUrl: string = 'https://ackindex.com'
): Promise<SocialMediaPosts> {
  const blogUrl = `${siteUrl}/blog/${blogPost.slug}`;

  const prompt = `You are a social media manager for AckIndex, a platform that makes Nantucket town meeting information accessible to residents. Generate engaging social media posts for a new blog article.

Blog Article Details:
- Title: ${blogPost.title}
- Summary: ${blogPost.excerpt}
- Meeting Type: ${blogPost.meeting_type || 'Town Meeting'}
- Meeting Date: ${blogPost.meeting_date || 'Recent'}
- Keywords: ${blogPost.keywords?.join(', ') || 'Nantucket, town meeting'}
- URL: ${blogUrl}

Generate posts for Facebook and Instagram. The tone should be:
- Informative but accessible
- Community-focused
- Encouraging civic engagement
- Professional but warm

For Facebook:
- Write 2-3 sentences that summarize the key topics discussed
- Include a call to action to read more
- Keep it under 250 characters (excluding hashtags)

For Instagram:
- Write an engaging caption (2-3 sentences)
- Focus on what residents can learn
- Keep it under 200 characters (excluding hashtags)

For hashtags:
- Include 3-5 relevant hashtags for each platform
- Always include #Nantucket #ACK #NantucketMA
- Add topic-specific tags based on content

Respond in this exact JSON format:
{
  "facebook": {
    "text": "Your Facebook post text here",
    "hashtags": ["Nantucket", "ACK", "NantucketMA", "topic1", "topic2"]
  },
  "instagram": {
    "caption": "Your Instagram caption here",
    "hashtags": ["Nantucket", "ACK", "NantucketMA", "topic1", "topic2"]
  }
}`;

  try {
    const response = await claudeComplete(prompt, {
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse social media response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as SocialMediaPosts;

    log.info({ blogId: blogPost.id, title: blogPost.title }, 'Generated social media posts');

    return parsed;
  } catch (error) {
    log.error({ error, blogId: blogPost.id }, 'Failed to generate social media posts');

    // Return fallback posts if generation fails
    return generateFallbackPosts(blogPost, blogUrl);
  }
}

/**
 * Generate fallback posts if AI generation fails
 */
function generateFallbackPosts(blogPost: BlogPostData, blogUrl: string): SocialMediaPosts {
  const meetingInfo = blogPost.meeting_type
    ? `${blogPost.meeting_type}`
    : 'town meeting';

  const dateInfo = blogPost.meeting_date
    ? ` from ${new Date(blogPost.meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : '';

  return {
    facebook: {
      text: `New on AckIndex: ${blogPost.title}. Read our summary of the ${meetingInfo}${dateInfo} and stay informed about what's happening in our community. ${blogUrl}`,
      hashtags: ['Nantucket', 'ACK', 'NantucketMA', 'TownMeeting', 'CivicEngagement'],
    },
    instagram: {
      caption: `Stay informed about Nantucket! New summary of the ${meetingInfo}${dateInfo} now available. Link in bio to read more.`,
      hashtags: ['Nantucket', 'ACK', 'NantucketMA', 'NantucketIsland', 'TownMeeting', 'LocalGovernment'],
    },
  };
}

/**
 * Format posts with hashtags for display/copying
 */
export function formatPostWithHashtags(text: string, hashtags: string[]): string {
  const hashtagString = hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ');
  return `${text}\n\n${hashtagString}`;
}

/**
 * Get character count for a formatted post
 */
export function getPostCharacterCount(text: string, hashtags: string[]): number {
  return formatPostWithHashtags(text, hashtags).length;
}
