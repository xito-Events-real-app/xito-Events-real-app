

# Video Editor Portal + Chat System

## Overview
Build a public-facing "Editor Portal" page (like the existing Crew Schedule page) that editors access via a WhatsApp-shareable link, plus a real-time chat system with @mention support that works both inside the Video Edit Tracker and on the editor portal.

## Architecture

### 1. New Database Table: `video_edit_chat`
Store chat messages with @mention metadata:

```sql
CREATE TABLE public.video_edit_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  editor_name text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  sender_type text NOT NULL DEFAULT 'admin',  -- 'admin' | 'editor'
  message text NOT NULL DEFAULT '',
  mentions text NOT NULL DEFAULT '',  -- JSON array of mentioned names
  tracker_row_id uuid,  -- optional: link to specific video edit row
  is_read boolean DEFAULT false
);
ALTER TABLE public.video_edit_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.video_edit_chat FOR ALL TO public USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_chat;
```

### 2. New Database Table: `video_edit_notifications`
Track changes pushed to editors in real-time:

```sql
CREATE TABLE public.video_edit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  editor_name text NOT NULL DEFAULT '',
  notification_type text NOT NULL DEFAULT '',  -- 'status_change' | 'assignment' | 'urgency' | 'deadline' | 'chat'
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tracker_row_id uuid,
  is_read boolean DEFAULT false
);
ALTER TABLE public.video_edit_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.video_edit_notifications FOR ALL TO public USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_notifications;
```

### 3. Public Editor Portal Page
**New file: `src/pages/EditorPortal.tsx`**
- Public route: `/editor-portal/:editorName` (no auth required)
- Shows the same data as the internal `EditorView` component but **read-only** except for play/pause
- Includes real-time notifications bell with unread count
- Includes the chat box at the bottom
- Uses Supabase realtime to auto-refresh when data changes from the main system

**New route in `App.tsx`:**
```tsx
<Route path="/editor-portal/:editorName" element={<EditorPortal />} />
```

### 4. WhatsApp Link Generator
**Update: `src/components/video-edit/DesktopVideoEditTracker.tsx`**
- Add a WhatsApp icon button at the top of each `EditorView` page (next to the editor name)
- On click: copies/sends a WhatsApp message with the portal link:
  `https://wtnclienttracker.lovable.app/editor-portal/{encodedEditorName}`
- Similar to the existing client portal link pattern

### 5. Chat Component with @Mentions
**New file: `src/components/video-edit/EditorChat.tsx`**
- Real-time chat box using `video_edit_chat` table
- @mention popup triggered by typing `@` — shows list of editors, client names
- Messages with mentions render highlighted @names
- Works in two contexts:
  1. Inside each editor's page in the Video Edit Tracker (admin side)
  2. On the public Editor Portal page (editor side, sender_type='editor')

### 6. Chat Section in Sidebar
**Update: `VideoEditSidebar`**
- Add a "Chat" nav item below Pipeline View in the sidebar
- When selected, shows a unified chat view with tabs per editor
- Unread message count badge on the Chat nav item

### 7. Notification System
**Update: `src/hooks/useVideoEditTracker.ts`**
- When `updateField`, `pushToStatus`, or `togglePlaying` is called, insert a notification row for the affected editor
- Example: moving a row to COLOR_QUEUE creates a notification: "Your edit for {clientName} has been moved to Color Queue"

### 8. Editor Portal Page Layout
The portal page will show:
- Editor name + greeting header
- Notification bell (top right) with dropdown of recent notifications
- "Currently Working On" card with play/pause button (only interactive element)
- "Next Up" card (read-only)
- Stage-grouped task list (read-only, same as EditorView)
- Chat box at the bottom (interactive)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/EditorPortal.tsx` | Create - public editor portal page |
| `src/components/video-edit/EditorChat.tsx` | Create - chat component with @mentions |
| `src/components/video-edit/EditorNotifications.tsx` | Create - notification bell + dropdown |
| `src/components/video-edit/DesktopVideoEditTracker.tsx` | Modify - add WhatsApp link to EditorView, add Chat to sidebar |
| `src/hooks/useVideoEditTracker.ts` | Modify - push notifications on changes |
| `src/App.tsx` | Modify - add public `/editor-portal/:editorName` route |
| Database migration | Create `video_edit_chat` and `video_edit_notifications` tables with realtime |

## Key Behaviors
- Chat is realtime (Supabase channels) — messages appear instantly on both sides
- @mention popup filters as you type after `@`
- Notifications are generated automatically when admin makes changes
- Editor portal only allows play/pause + chat; everything else is view-only
- Each editor sees only their own assignments (filtered by editor name)

