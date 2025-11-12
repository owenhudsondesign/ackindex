/**
 * Buffer API Client
 * https://buffer.com/developers/api
 */

import logger from './logger';

const log = logger.child({ module: 'bufferClient' });

const BUFFER_API_BASE = 'https://api.bufferapp.com/1';

interface BufferProfile {
  id: string;
  service: 'facebook' | 'twitter' | 'linkedin' | 'instagram';
  formatted_service: string;
  formatted_username: string;
}

interface BufferPost {
  id: string;
  status: 'buffer' | 'sent' | 'failed';
  scheduled_at: number | null;
  text: string;
  profile_ids: string[];
}

interface CreatePostParams {
  profileIds: string[];
  text: string;
  media?: {
    photo?: string; // URL to image
  };
  scheduledAt?: Date; // Optional: schedule for later
  now?: boolean; // Post immediately
}

/**
 * Get all Buffer profiles (Instagram, Facebook, etc.)
 */
export async function getBufferProfiles(): Promise<BufferProfile[]> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('BUFFER_ACCESS_TOKEN not configured');
  }

  try {
    const response = await fetch(
      `${BUFFER_API_BASE}/profiles.json?access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Buffer API error: ${response.status} - ${error}`);
    }

    const profiles = await response.json();
    log.info({ profileCount: profiles.length }, 'Fetched Buffer profiles');
    return profiles;
  } catch (error) {
    log.error({ error }, 'Failed to fetch Buffer profiles');
    throw error;
  }
}

/**
 * Create a post in Buffer (queued for admin approval by default)
 */
export async function createBufferPost(params: CreatePostParams): Promise<BufferPost> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('BUFFER_ACCESS_TOKEN not configured');
  }

  try {
    // Build form data
    const formData = new URLSearchParams();
    formData.append('text', params.text);

    // Add profile IDs
    params.profileIds.forEach(id => {
      formData.append('profile_ids[]', id);
    });

    // Add media if provided
    if (params.media?.photo) {
      formData.append('media[photo]', params.media.photo);
    }

    // Schedule or queue
    if (params.now) {
      formData.append('now', 'true');
    } else if (params.scheduledAt) {
      formData.append('scheduled_at', Math.floor(params.scheduledAt.getTime() / 1000).toString());
    }
    // If neither now nor scheduledAt, it goes to the queue for approval

    const response = await fetch(
      `${BUFFER_API_BASE}/updates/create.json?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Buffer API error: ${response.status} - ${error}`);
    }

    const post = await response.json();
    log.info({ postId: post.id, profileIds: params.profileIds }, 'Created Buffer post');
    return post;
  } catch (error) {
    log.error({ error, params }, 'Failed to create Buffer post');
    throw error;
  }
}

/**
 * Get a specific post
 */
export async function getBufferPost(postId: string): Promise<BufferPost> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('BUFFER_ACCESS_TOKEN not configured');
  }

  try {
    const response = await fetch(
      `${BUFFER_API_BASE}/updates/${postId}.json?access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Buffer API error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    log.error({ error, postId }, 'Failed to fetch Buffer post');
    throw error;
  }
}

/**
 * Queue Instagram post to Buffer for approval
 */
export async function queueInstagramPostInBuffer(
  instagramPost: { content: string; hashtags: string[] },
  imageUrl: string
): Promise<string> {
  // Get Buffer profile ID from env
  const instagramProfileId = process.env.BUFFER_INSTAGRAM_PROFILE_ID;

  if (!instagramProfileId) {
    throw new Error('BUFFER_INSTAGRAM_PROFILE_ID not configured');
  }

  // Format post with hashtags
  const instagramText = instagramPost.content + '\n\n' +
    instagramPost.hashtags.map(h => `#${h}`).join(' ');

  // Create Instagram post in Buffer
  const igPost = await createBufferPost({
    profileIds: [instagramProfileId],
    text: instagramText,
    media: { photo: imageUrl },
  });

  log.info(
    { instagramPostId: igPost.id },
    'Queued Instagram post in Buffer for approval'
  );

  return igPost.id;
}
