

## Plan: Direct pCloud API Access (Bypass Edge Function Proxy)

### Why It's Slow

Every pCloud call currently follows this path:

```text
Browser → Supabase Edge Function → pCloud API → Edge Function → Browser
```

This adds 200-500ms latency per request. For thumbnails, the edge function fetches each one individually in a sequential loop, compounding the delay.

### Solution: Get Auth Token Once, Then Call pCloud Directly

pCloud's API is designed for direct browser access (they have a JS SDK). We can eliminate the proxy for read operations by:

1. **Add a `getauth` action** to the edge function that returns just the cached auth token
2. **Call pCloud API directly from the browser** for `listfolder`, `getfilelink`, `getthumblink`, etc.
3. **Cache the token client-side** (valid for ~1 hour) so subsequent calls skip the edge function entirely

New flow:
```text
Browser → Edge Function (once, get token)
Browser → pCloud API directly (all subsequent calls)
```

### Files to Modify

**1. `supabase/functions/pcloud-api/index.ts`**
- Add a `getauth` action that returns the cached auth token to the browser

**2. `src/lib/pcloud-api.ts`**
- Add `getPCloudAuthToken()` that fetches the token from the edge function once and caches it in memory
- Change `listPCloudFolder`, `getPCloudFileLink`, `getPCloudThumbUrl`, `getPCloudThumbsBatch` to call `https://api.pcloud.com` directly using the cached token
- For `getthumbslinks`, fetch all thumbs in parallel directly from the browser instead of sequentially through the edge function
- Keep `uploadToPCloud` and write operations through the edge function (they need server-side handling)

**3. `src/components/edited-files/PCloudBrowser.tsx`**
- No changes needed — the API layer handles it transparently

### Technical Details

Client-side token cache:
```typescript
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }
  const { data } = await supabase.functions.invoke('pcloud-api', {
    body: { action: 'getauth', params: {} }
  });
  cachedToken = { token: data.auth, expiresAt: Date.now() + 3500000 };
  return cachedToken.token;
}
```

Direct pCloud call:
```typescript
async function callPCloudDirect(endpoint: string, params: Record<string, string>) {
  const auth = await getAuthToken();
  const query = new URLSearchParams({ auth, ...params });
  const res = await fetch(`https://api.pcloud.com${endpoint}?${query}`);
  return res.json();
}
```

This eliminates the edge function round-trip for every browse/preview action, making it as fast as native pCloud.

