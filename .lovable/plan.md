

# Fix: Client Contact Details Not Appearing After Form Submission

## Problem

When a client fills out the contact form, the data is saved directly to the **Google Sheet** ("BOOKED CLIENTS CONTACT DETAILS"). However, the Client Detail page reads from the **Supabase cache table** (`contact_details_cache`) first. Since the cache still has the old (empty) data, it returns that and never falls through to Google Sheets -- so the filled details never appear.

The root cause is in `useClientContactDetails.ts` (line 26):
```
if (!cacheError && cached) {
  // Returns cached (stale) data -- never checks Sheets
}
```

The cache row exists (created during Master Sync with empty fields), so the hook returns it immediately with all blank values.

## Solution

Two changes to close the gap:

### 1. Update `contact_details_cache` after form submission (edge function)

In `supabase/functions/google-sheets/index.ts`, after the `updateClientContactDetails` function successfully writes to Google Sheets, also upsert the updated data into the `contact_details_cache` Supabase table. This ensures the cache is immediately consistent.

**What changes:**
- After the Sheets write succeeds (line ~1427), fetch the updated row from Sheets using `getClientContactDetails`
- Upsert the result into `contact_details_cache` using the Supabase service client
- This means next time anyone opens the Client Detail page, the cache has the fresh data

### 2. Add a staleness check to the cache read (frontend hook)

In `src/hooks/useClientContactDetails.ts`, when a cached row is found but has no filled data (all bride/groom fields empty), treat it as a cache miss and fall through to the Sheets API. This handles the case where form data was submitted but the cache upsert somehow failed.

**What changes:**
- After loading from cache, check if at least one meaningful field (e.g., `bride_full_name`, `groom_full_name`) has data
- If the cache row is all-empty, skip it and fetch from Sheets instead
- If Sheets returns data, upsert it back into the cache for future reads

## Technical Details

### File: `supabase/functions/google-sheets/index.ts`

In the `updateClientContactDetails` function (around line 1426), after the successful Sheets update:

```typescript
// After successful sheet update, sync to Supabase cache
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Re-read the updated row from Sheets
const freshData = await getClientContactDetails(accessToken, spreadsheetId, registeredDateTimeAD);

// Upsert into contact_details_cache
await supabase.from('contact_details_cache').upsert({
  registered_date_time_ad: registeredDateTimeAD,
  row_number: freshData.rowNumber,
  bride_full_name: freshData.brideFullName,
  bride_contact_number: freshData.brideContactNumber,
  // ... all other fields mapped
  updated_at: new Date().toISOString(),
}, { onConflict: 'registered_date_time_ad' });
```

### File: `src/hooks/useClientContactDetails.ts`

In `fetchContactDetails`, after the cache read succeeds, add an emptiness check:

```typescript
if (!cacheError && cached) {
  // Check if the cached row actually has data
  const hasData = !!(
    cached.bride_full_name || cached.groom_full_name ||
    cached.bride_contact_number || cached.groom_contact_number
  );
  
  if (hasData) {
    // Use cached data
    setData({ ... });
    setIsLoading(false);
    return;
  }
  // Otherwise fall through to Sheets API
  console.log('[useClientContactDetails] Cache row is empty, fetching from Sheets...');
}
```

When the Sheets fallback returns data, also upsert it back into the cache:

```typescript
if (result?.data) {
  setData(result.data);
  // Backfill cache
  await supabase.from('contact_details_cache').upsert({
    registered_date_time_ad: registeredDateTimeAD,
    // ... map all fields
  }, { onConflict: 'registered_date_time_ad' });
}
```

## Impact

- Clients who fill the form will have their data visible immediately on the Client Detail page
- Old cached empty rows will be automatically refreshed on next view
- No change to the existing Master Sync flow -- it continues to work as before
- The Resync button on the Client Detail page also continues to work as a manual override

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Upsert to `contact_details_cache` after form data is saved to Sheets |
| `src/hooks/useClientContactDetails.ts` | Skip empty cache rows and fall through to Sheets; backfill cache after Sheets read |

