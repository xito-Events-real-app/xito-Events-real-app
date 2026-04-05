

# Event Info Card Fixes — White Theme, Video-Only Files, Smart Filtering

## Changes to `src/components/suite/YouTubeDashboard.tsx`

### 1. Remove Photographers section
Delete the entire photographers block (lines ~1264-1279). Remove `photographers` from the state type and the fetch logic (remove `photographer_bride`, `photographer_groom`, `extra_photographer` from the query). Remove the `Camera` import if unused elsewhere.

### 2. White background theme
Change the card background from `bg-gradient-to-br from-slate-800 to-slate-900` to `bg-white border border-gray-200 shadow-sm`. Update all text colors:
- Labels: `text-gray-500` instead of `text-slate-500`
- Values: `text-gray-900` instead of `text-white`
- Bride pill: `text-pink-600 hover:text-pink-500` instead of `text-pink-400`
- Groom pill: `text-cyan-600 hover:text-cyan-500` instead of `text-cyan-400`
- Videographer pills: `bg-blue-100 text-blue-700 hover:bg-blue-200`
- Device badges: `bg-gray-100 text-gray-700`
- Date icon: `text-teal-600`, date text: `text-gray-700`
- GB text: `text-emerald-600`

### 3. Video-only file size
In the `files_management` query, add a filter for video-related `freelancer_type` codes only. Add `.in('freelancer_type', ['VB', 'VG', 'EV', 'IP', 'DR', 'FP'])` to exclude photo file rows from the size calculation.

### 4. Smart filtering for client names (bride/groom)
When clicking bride or groom name, instead of searching the exact full name in video titles (which won't match), look up the `clients_cache` `client_name` for this `registered_date_time_ad` and use the **client name** as the search query. Video titles typically contain the client name (e.g., "Madhav x Urmila"), not the full bride/groom name. So we search by the client's last name or the client_name field.

Implementation: Store `clientName` in `eventCardData` (from `trackerInfo.client_name`). When bride/groom is clicked, call `handleNameFilter(eventCardData.clientName)` instead of the bride/groom full name. This surfaces all videos for that client.

### 5. Smart filtering for videographer names
When clicking a videographer name like "Barun", we need to find all clients where Barun shot video, then filter the sidebar to show those clients' videos.

Implementation:
- When a videographer pill is clicked, query `freelancer_assignments` for all rows where this person appears in any videographer column (`videographer_bride`, `videographer_groom`, `extra_videographer`)
- Collect all unique `client_name` values from those rows
- Build a filter function that checks if any of those client names appear in the video title
- Store this as a custom filter state (e.g., `freelancerFilter: { name: string; clientNames: string[] }`)
- Modify `filteredRecentVideos` and `filteredPlaylists` to use this filter: check if any client name from the list appears in the video title (partial, case-insensitive match)
- Show the filter badge as "🎥 Barun" with × to clear

### 6. Filter badge update
When `nameFilter` is set, show filter badge. When `freelancerFilter` is set, show "🎥 {name}" badge instead. Clearing either resets both.

## Data Flow for Freelancer Filter
```text
Click "Barun" → query freelancer_assignments WHERE videographer_bride/groom/extra = 'Barun'
  → collect client_name set: ["Madhav x Urmila", "Ram x Sita", ...]
  → filter sidebar: video.title.includes(clientName) for any clientName in set
```

