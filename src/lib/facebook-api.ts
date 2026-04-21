/**
 * Facebook Graph API v21.0 Service
 *
 * Wraps all Facebook Graph API calls for the LaptopFlip app.
 * Handles token exchange, user info, pages, groups, marketplace,
 * posting, and insights retrieval.
 */

import { db } from '@/lib/db';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v21.0';

// ─── Helpers ──────────────────────────────────────────────

function getFacebookConfig() {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Facebook App ID and App Secret must be configured in .env');
  }
  return { appId, appSecret };
}

async function graphFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const url = `${FACEBOOK_GRAPH_URL}${path}`;
  const separator = path.includes('?') ? '&' : '?';
  const fetchUrl = `${url}${separator}access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(fetchUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Facebook API error (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── Token Exchange ───────────────────────────────────────

export async function exchangeShortTokenForLong(shortToken: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const { appId, appSecret } = getFacebookConfig();

  const url =
    `${FACEBOOK_GRAPH_URL}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${encodeURIComponent(appId)}&` +
    `client_secret=${encodeURIComponent(appSecret)}&` +
    `fb_exchange_token=${encodeURIComponent(shortToken)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };
}

// ─── User Info ────────────────────────────────────────────

export async function getUserInfo(accessToken: string): Promise<{
  id: string;
  name: string;
  email: string | null;
  picture: { data: { url: string; width: number; height: number } };
}> {
  return graphFetch('/me?fields=id,name,email,picture.width(200)', accessToken);
}

// ─── Pages ────────────────────────────────────────────────

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture: { data: { url: string } } | null;
}

export async function getUserPages(accessToken: string): Promise<FacebookPage[]> {
  interface PagesResponse {
    data: FacebookPage[];
    paging?: { next?: string; cursors?: { before?: string; after?: string } };
  }

  const response = await graphFetch<PagesResponse>(
    '/me/accounts?fields=id,name,access_token,category,picture.width(200)',
    accessToken
  );

  return response.data ?? [];
}

// ─── Groups ───────────────────────────────────────────────

export interface FacebookGroup {
  id: string;
  name: string;
  privacy: string;
  member_count: number;
  administrator: boolean;
}

export async function getUserGroups(accessToken: string): Promise<FacebookGroup[]> {
  interface GroupsResponse {
    data: FacebookGroup[];
    paging?: { next?: string; cursors?: { before?: string; after?: string } };
  }

  const response = await graphFetch<GroupsResponse>(
    '/me/groups?fields=id,name,privacy,member_count,administrator',
    accessToken
  );

  // Filter: only groups where user is admin (can post)
  const groups = response.data ?? [];
  return groups.filter((g) => g.administrator === true);
}

// ─── Posting ──────────────────────────────────────────────

export interface PostToPageData {
  message: string;
  link?: string;
  imageUrls?: string[];
}

export async function postToPage(
  pageAccessToken: string,
  pageId: string,
  data: PostToPageData
): Promise<{ id: string }> {
  // If there are image URLs, we need to post them as photos first,
  // then attach the post. Otherwise just post the message to feed.
  if (data.imageUrls && data.imageUrls.length > 0) {
    // Post images as a multi-photo post
    // Step 1: Create a unpublished photo for each image
    const photoIds: string[] = [];

    for (const imageUrl of data.imageUrls) {
      // Facebook doesn't accept arbitrary URLs for photo posts via API.
      // The images need to be uploaded as multipart/form-data or be publicly accessible URLs.
      // For a URL, we try posting it directly.
      const formData = new FormData();
      formData.append('url', imageUrl);
      formData.append('published', 'false');
      formData.append('message', data.message);

      try {
        const response = await fetch(
          `${FACEBOOK_GRAPH_URL}/${pageId}/photos?access_token=${encodeURIComponent(pageAccessToken)}`,
          {
            method: 'POST',
            body: formData,
          }
        );
        if (response.ok) {
          const result = await response.json();
          photoIds.push(result.id);
        }
      } catch {
        // Skip failed image uploads
        console.warn(`Failed to upload image: ${imageUrl}`);
      }
    }

    // Step 2: If we got photo IDs, create a multi-photo post
    if (photoIds.length > 0) {
      const multiPhotoResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${pageId}/feed?access_token=${encodeURIComponent(pageAccessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: data.message,
            link: data.link,
            attached_media: photoIds.slice(0, 4).map((id) => ({
              media_fbid: id,
            })),
          }),
        }
      );

      if (!multiPhotoResponse.ok) {
        const errorBody = await multiPhotoResponse.text();
        throw new Error(`Page post failed: ${errorBody}`);
      }

      return multiPhotoResponse.json();
    }

    // Fallback: post without images if uploads failed
  }

  // Simple text/link post to page feed
  const postBody: Record<string, string> = { message: data.message };
  if (data.link) postBody.link = data.link;

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${pageId}/feed?access_token=${encodeURIComponent(pageAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Page post failed: ${errorBody}`);
  }

  return response.json();
}

export interface PostToGroupData {
  message: string;
  link?: string;
}

export async function postToGroup(
  userAccessToken: string,
  groupId: string,
  data: PostToGroupData
): Promise<{ id: string }> {
  const postBody: Record<string, string> = { message: data.message };
  if (data.link) postBody.link = data.link;

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${groupId}/feed?access_token=${encodeURIComponent(userAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Group post failed: ${errorBody}`);
  }

  return response.json();
}

export interface MarketplaceListingData {
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  availability: string;
  images: string[];
  listing_type?: string;
}

export async function postToMarketplace(
  userAccessToken: string,
  data: MarketplaceListingData
): Promise<{ id: string }> {
  // Facebook Marketplace API requires special permissions (marketplace_add_listing)
  // and uses a different endpoint structure

  // Step 1: Create the product item
  const itemData = {
    title: data.title,
    description: data.description,
    price: data.price,
    currency: data.currency,
    condition: data.condition,
    availability: data.availability || 'FOR_SALE',
    images: data.images.slice(0, 10).map((url) => ({ url })),
    listing_type: data.listing_type || 'PRODUCT',
  };

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/me/marketplace_listings?access_token=${encodeURIComponent(userAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Marketplace listing failed (${response.status}): ${errorBody}. ` +
      'Note: Marketplace API requires marketplace_add_listing permission.'
    );
  }

  return response.json();
}

// ─── Insights ─────────────────────────────────────────────

export interface PostInsights {
  impressions: number;
  reach: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
}

export async function getPostInsights(
  pageAccessToken: string,
  postId: string
): Promise<PostInsights> {
  // The post ID format is usually "{pageId}_{postId}"
  // We need the full post ID for insights
  const cleanPostId = postId.startsWith('/') ? postId.slice(1) : postId;

  try {
    interface PostData {
      id?: string;
      impressions?: { data: Array<{ values: Array<{ value: number }> }> };
      reach?: { data: Array<{ values: Array<{ value: number }> }> };
      clicks?: { data: Array<{ values: Array<{ value: number }> }> };
      likes?: { data: { count: number }; summary: { total_count: number } };
      comments?: { data: { count: number }; summary: { total_count: number } };
      shares?: { data: { count: number } };
    }

    const post = await graphFetch<PostData>(
      `/${cleanPostId}?fields=shares.limit(0).summary(true),comments.limit(0).summary(true),likes.limit(0).summary(true)`,
      pageAccessToken
    );

    return {
      impressions: post.impressions?.data?.[0]?.values?.[0]?.value ?? 0,
      reach: post.reach?.data?.[0]?.values?.[0]?.value ?? 0,
      clicks: post.clicks?.data?.[0]?.values?.[0]?.value ?? 0,
      likes: post.likes?.summary?.total_count ?? post.likes?.data?.count ?? 0,
      comments: post.comments?.summary?.total_count ?? post.comments?.data?.count ?? 0,
      shares: post.shares?.data?.count ?? 0,
    };
  } catch (error) {
    console.error(`Failed to fetch insights for post ${cleanPostId}:`, error);
    return {
      impressions: 0,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
  }
}

export interface PageInsight {
  name: string;
  period: string;
  values: Array<{ value: number; end_time: string }>;
}

export async function getPageInsights(
  pageAccessToken: string,
  pageId: string,
  period: string = 'day'
): Promise<PageInsight[]> {
  interface InsightsResponse {
    data: PageInsight[];
    paging?: { next?: string };
  }

  const metrics = 'page_impressions,page_impressions_unique,page_engaged_users,page_post_engagements';

  const response = await graphFetch<InsightsResponse>(
    `/${pageId}/insights?metric=${metrics}&period=${period}`,
    pageAccessToken
  );

  return response.data ?? [];
}

// ─── Token Validation ─────────────────────────────────────

export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const user = await graphFetch<{ id: string }>(
      '/me?fields=id',
      accessToken
    );
    return !!user && !!user.id;
  } catch {
    return false;
  }
}

// ─── Database Connection ──────────────────────────────────

export async function disconnectFacebook(connectionId: string): Promise<void> {
  await db.facebookConnection.delete({
    where: { id: connectionId },
  });
}

/**
 * Get the current (most recent) Facebook connection from the database.
 */
export async function getCurrentConnection() {
  return db.facebookConnection.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { posts: true },
  });
}
