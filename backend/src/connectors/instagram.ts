// Instagram connector.
// Instagram requires an approved Meta app + access token even for oEmbed,
// so there is NO free automatic metadata path. We are honest about that:
// entries are created from the URL with platform/format detected, and all
// other fields are entered manually or via CSV. We never ask for the user's
// Instagram password and never bypass Instagram's protections.

import type { FetchedMetadata } from './youtube.js';

export const INSTAGRAM_LIMITATION_MESSAGE =
  'Instagram does not offer free public API access to post metadata or metrics ' +
  '(even oEmbed now requires an approved Meta app token). ' +
  'The post was saved from its URL — fill in the caption and metrics manually (they are visible on the public post page) or import via CSV.';

export async function fetchInstagramMetadata(_url: string): Promise<FetchedMetadata> {
  return {
    source: 'instagram-manual',
    partial: true,
    message: INSTAGRAM_LIMITATION_MESSAGE,
  };
}
