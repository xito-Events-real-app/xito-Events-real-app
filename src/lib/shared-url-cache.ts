/**
 * Shared signed-URL cache used by both PortalMyPhotos and PortalMyAlbum.
 * Module-level singleton — survives unmount/remount within the same session.
 */
const sharedUrlCache: Record<string, string> = {};

/** Store a batch of key→url mappings */
export function cacheUrls(urls: Record<string, string>) {
  Object.assign(sharedUrlCache, urls);
}

/** Look up cached URLs for a list of keys. Returns { hits, missingKeys } */
export function lookupUrls(keys: string[]): { hits: Record<string, string>; missingKeys: string[] } {
  const hits: Record<string, string> = {};
  const missingKeys: string[] = [];
  for (const key of keys) {
    if (sharedUrlCache[key]) {
      hits[key] = sharedUrlCache[key];
    } else {
      missingKeys.push(key);
    }
  }
  return { hits, missingKeys };
}
