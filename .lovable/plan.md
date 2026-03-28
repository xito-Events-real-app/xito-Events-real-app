

## Plan: pCloud Drive Enhancements — Deep Links, Activity Feed & Storage Quota

### 1. "Open in pCloud" link on every folder card

**File: `src/components/xito-drive/XitoDriveFolderCard.tsx`**
- Add an optional `pcloudPath` prop to the card component
- Below the folder name/size, render a small "Open in pCloud" link with a tiny Cloud icon
- The link opens `https://my.pcloud.com/#page=filemanager&folder=FOLDERID` on desktop
- On mobile, use the `pcloud://` URI scheme to attempt opening the pCloud app. Fallback: `https://my.pcloud.com/...`
- The link gets `e.stopPropagation()` so clicking it doesn't trigger the folder navigation

**File: `src/components/pcloud-drive/PCloudDriveBrowser.tsx`**
- Pass `pcloudFolderId` to each `XitoDriveFolderCard` by matching the folder name against `pcloudItems` that were fetched for the current level
- For virtual folders that haven't been synced yet (no matching pCloud folder), don't show the link

### 2. Activity feed sidebar — "Recent pCloud Changes"

**File: `src/lib/pcloud-api.ts`**
- Add `getPCloudQuota()` function: calls pCloud's `/userinfo` endpoint (already authenticated) which returns `quota` and `usedquota` fields
- Export a new type `PCloudQuota { used: number; total: number; free: number }`

**File: `src/components/pcloud-drive/PCloudActivitySidebar.tsx`** (new)
- A right-side panel component showing:
  - **Storage bar**: used/total/free from `getPCloudQuota()` with a progress bar and formatted sizes (e.g. "234 GB / 2 TB used")
  - **Recent edited uploads**: fetches from `edited_files` table where `storage_type = 'pcloud'` or `pcloud_file_id IS NOT NULL`, ordered by `created_at DESC`, limit 20
  - Each entry shows: client name, event, photographer, file size — formatted like "Shakti Neupane : Wedding BS : nikit : 234 GB"

**File: `src/pages/PCloudDrive.tsx`**
- On desktop: render the page as a flex row with the browser on the left and `PCloudActivitySidebar` on the right (similar to the Breaking News sidebar in `DesktopSuiteLanding`)
- On mobile: add a small toggle button to show/hide the sidebar as a sheet/drawer

### 3. Edge function update for quota

**File: `supabase/functions/pcloud-api/index.ts`**
- Add a `userinfo` action in the switch that calls `/userinfo` with the auth token and returns `quota`, `usedquota`, `email`, and `premium` fields

### Technical Details

- pCloud web link format: `https://my.pcloud.com/#page=filemanager&folder=FOLDER_ID` (verified from pCloud docs)
- pCloud app deep link: `pcloud://folder/FOLDER_ID` — on mobile, attempt this first with a timeout fallback to web URL
- The `/userinfo` pCloud endpoint already returns quota info (it's the same endpoint used for login, but the `quota` and `usedquota` fields are always present)
- The activity feed queries the existing `edited_files` table — no new tables needed

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/xito-drive/XitoDriveFolderCard.tsx` | Add "Open in pCloud" link with folder ID prop |
| `src/components/pcloud-drive/PCloudDriveBrowser.tsx` | Pass pCloud folder IDs to cards |
| `src/lib/pcloud-api.ts` | Add `getPCloudQuota()` |
| `supabase/functions/pcloud-api/index.ts` | Add `userinfo` action |
| `src/components/pcloud-drive/PCloudActivitySidebar.tsx` | New — activity feed + storage stats |
| `src/pages/PCloudDrive.tsx` | Add sidebar layout |

