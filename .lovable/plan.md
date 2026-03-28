

## Plan: Fix pCloud Drive — Auto-calculate sizes, filter activity to WTN, news-style feed

### Issues to fix

1. **Folder sizes not auto-calculated on first load** — currently only shows sizes if user clicks "Recalculate". Need to auto-trigger calculation when no cached sizes exist.
2. **"Recalculate Sizes" should always calculate ALL folders under `/WEDDING TALES NEPAL`** — not just current level.
3. **Recent Changes shows all pCloud activity** — the `/diff` API returns changes across the entire account. Need to filter server-side to only show entries whose path starts with `/WEDDING TALES NEPAL`.
4. **Activity feed looks like a log, not news** — needs a "Breaking News" style with descriptive headlines like "New video uploaded to Shakti Wedding folder".

### Changes

#### 1. Edge function: Filter diff to WTN folder only
**File: `supabase/functions/pcloud-api/index.ts`**
- Modify the `getdiff` action to post-process entries
- For each diff entry, use `/stat` with the `fileid` to get the full path, or better: the diff API returns `metadata` with `parentfolderid` — resolve parent chain
- Simpler approach: use pCloud's `/listfolder` with `recursive=1` on `/WEDDING TALES NEPAL` sorted by `modified DESC` to get recently modified files. This is more reliable than diff.
- Add a new action `getrecentuploads` that:
  - Lists `/WEDDING TALES NEPAL` recursively
  - Collects all files, sorts by `modified` or `created` timestamp descending
  - Returns top 30 with their full path segments (client name, event, etc.)

#### 2. Auto-calculate sizes on first visit
**File: `src/components/pcloud-drive/PCloudDriveBrowser.tsx`**
- In the `useEffect` that loads cached sizes from DB, check if any sizes exist for WTN root subfolders
- If none exist (first time), auto-trigger `handleRecalculateSizes` for `/WEDDING TALES NEPAL`
- The "Recalculate Sizes" button should ALWAYS calculate all subfolders of `/WEDDING TALES NEPAL` regardless of current breadcrumb level

#### 3. News-style activity feed
**File: `src/components/pcloud-drive/PCloudActivitySidebar.tsx`**
- Replace the raw diff entries with the new `getrecentuploads` data
- Each entry rendered as a news card with:
  - Headline: "New upload in **[Client Name] > [Event]**"
  - Details: file name, size, time ago
  - Icon: photo or video badge
  - Extract client/event from path segments: `/WEDDING TALES NEPAL/2082-Baisakh/ClientName/Photos/Event/file.jpg`

#### 4. Edge function: `getrecentuploads` action
**File: `supabase/functions/pcloud-api/index.ts`**
- New action that does recursive listing of `/WEDDING TALES NEPAL`
- Collects all non-folder items with their full path
- Sorts by `modified` descending
- Returns top 30 entries with parsed path segments (monthYear, clientName, category, event, fileName, size, modified)

### Technical details

- pCloud's `/diff` endpoint returns account-wide changes without path info — not suitable for WTN-only filtering
- pCloud's `/listfolder?recursive=1` returns the full tree with `modified` timestamps on each file — we can extract recent uploads from this
- The recursive listing of WTN root can be large, so we process server-side in the edge function and only return the 30 most recent files
- Path parsing: split by `/` → `['', 'WEDDING TALES NEPAL', monthYear, clientName, category, event, ...]`

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/pcloud-api/index.ts` | Add `getrecentuploads` action |
| `src/components/pcloud-drive/PCloudActivitySidebar.tsx` | Rewrite to use `getrecentuploads`, news-style cards |
| `src/components/pcloud-drive/PCloudDriveBrowser.tsx` | Auto-trigger size calculation on first load; always calculate from WTN root |

