

# Add "Link to Video Edit Tracker" Fallback for Unmatched YouTube Videos

## Problem
Old videos like "SIMRAN's BRIDE RECEPTION HIGHLIGHTS || WEDDING TALES NEPAL" or custom-titled videos have no linked tracker row, so the metadata section (editor, timings, event age) is completely blank with no way to fix it.

## Solution
When `trackerInfo` is null, show an "EDITING DETAILS NOT FOUND" state with a "Link Video Edit Tracker" button. This button opens a popup that:
1. Auto-suggests tracker rows by matching words from the video title against client names (bride/groom from `contact_details_cache`) and event names
2. Allows searching by client name
3. Shows each suggestion as: client name, event name, edit type, status
4. On selection, writes the YouTube video ID into that tracker row's `youtube_link` field, immediately showing the details

## File to Modify
**`src/components/suite/YouTubeDashboard.tsx`** only

### Change 1: Add a `manualLinkOpen` state and search state
- `const [manualLinkOpen, setManualLinkOpen] = useState(false)`
- `const [linkSearch, setLinkSearch] = useState("")`

### Change 2: Build suggestion logic
- When the popup opens, compute suggestions from `allTrackerRows`:
  - Extract significant words (≥3 chars) from the video title (before `||`)
  - Match against `client_name` and `event_name` fields
  - Also allow free-text search by `client_name`
- Show results as a list: **Client Name** · Event Name · Edit Type · Status badge

### Change 3: Replace the empty space where `trackerInfo` would be (after line ~1051)
When `!trackerInfo && activeVideo`:
- Show a styled "EDITING DETAILS NOT FOUND" message
- Show a "Link Video Edit Tracker" button that opens the popup dialog

### Change 4: Handle selection
- On selecting a tracker row, update `video_edit_tracker.youtube_link` by appending the current video URL
- Set `trackerInfo` to the selected row so details appear immediately
- Close the dialog

### Change 5: The popup UI
- Dialog with search input at top
- Auto-populated suggestions below (title-word matches first, then search results)
- Each row shows: client name, event name, edit type, status badge
- Clicking a row links the video and closes

## Expected Result
- For any video without auto-matched details, user sees "EDITING DETAILS NOT FOUND" + a link button
- Clicking it shows matching tracker rows based on video title words and allows searching
- After selection, details (editor, colorist, timings, event age, type) appear immediately
- Future plays of this video will auto-match via `youtube_link`

