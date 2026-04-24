# Photo Edit Tracker module

A new module called **Photo Edit Tracker** that behaves like the current Video Edit Tracker, but is driven by the **photo deliverables** section instead of video deliverables.

## What will be built

### 1) New Photo Edit Tracker page

Replace the current `/photo-edit` coming-soon page with a full tracker.

It will keep the same overall structure as Video Edit Tracker:

- **Dashboard** view
- **Classic** view
- **Pipeline** view
- editor list in the left sidebar
- active / paused / on queue / available editor groupings
- deadline support
- editor assignment
- editor portal link

### 2) Photo-specific workflow stages

The photo tracker will use a reduced pipeline:

- Queue
- Edit Lab
- Edit on Progress
- Exported
- Client Review
- Re-Edit on Progress
- Finalized

Removed for photos:

- Color Queue
- Color Lab
- Color on Progress
- Export Queue

### 3) Auto-create rows from photo deliverables

Rows will be generated from the **photo deliverables** section in `client_deliverables`.

Per your confirmation:

- generate rows for **all enabled photo deliverables**
- this includes the default photo deliverable behavior from Deliverables, where **All Photos** is on by default
- queue will auto-fill from booked events, same pattern as video tracker

Planned row mapping:

- `all_photos` -> `All Photos`
- `selected_photos` -> `Selected Photos`
- `insta_post` -> `Insta Post`

If quantity/item names exist for a photo deliverable, rows will be expanded using the same style as video tracker where practical.

### 4) Chaitra auto-finalization rule

Per your answer, every photo edit row whose event date is **up to the end of Chaitra 2082** will be created or moved directly into:

- **Finalized**

Later dates will follow the normal flow starting from Queue.

### 5) Dedicated photo editor portal

Add a separate public portal route for photo editors, parallel to the current video editor portal.

This page will include the editor cards you requested inside the editor page:

- Current
- Next Up
- Last Finalized
- Finalized
- Re-Edits

It will also support:

- play/pause style work state
- grouped rows by stage
- live updates
- deadline visibility

## Data model

Create a new table for photo edit tracking instead of mixing with video data.

### New table

`photo_edit_tracker`

It will mirror the video tracker structure closely so the UI can be reused safely, including fields like:

- client/event identity
- event date parts
- photo edit status
- urgency
- edit type
- editor
- company notes / client demand / reference
- deadline
- stage history
- play/pause state
- edit started time
- deleted flag
- synced flag
- timestamps

RLS will match the existing internal tracker pattern:

- authenticated users: full access
- optional public read/update policy only for the dedicated photo editor portal route, if needed

## Files likely to be added or changed

### New photo tracker logic

- `src/lib/photo-edit-api.ts`
- `src/lib/photo-edit-push-scheduler.ts` if sheet sync is kept
- `src/hooks/usePhotoEditTracker.ts`
- `src/pages/PhotoEditTracker.tsx`
- `src/pages/PhotoEditorPortal.tsx`

### Reused / adapted UI

Either:

- extract shared tracker UI from the video tracker into reusable components, or
- clone the video tracker components into photo-specific versions and remove color-stage logic

Likely touched:

- `src/App.tsx`
- `src/lib/suite-modules.ts`
- `src/components/video-edit/DesktopVideoEditTracker.tsx` or shared replacements
- `src/components/video-edit/MobileVideoEditTracker.tsx` or shared replacements
- `src/components/video-edit/WtnPipelineView.tsx` or shared replacements

### Database

- new migration for `photo_edit_tracker`
- type generation update will follow automatically

## Technical details

### Row generation source

The implementation will follow the same pattern as `ensureVideoEditRows()` and `syncWithDeliverables()` in `src/lib/video-edit-api.ts`, but for photo sections:

- read booked events from `event_details_cache`
- confirm booked clients from `clients_cache`
- read photo deliverables from `client_deliverables` where section is `photos`
- treat `all_photos` as default-on unless explicitly disabled
- create missing tracker rows
- soft-delete stale queue rows when a photo deliverable is disabled

### Editor source

Available editors will come from `freelancers_cache.photo_editor = YES`, just like video uses `video_editor = YES`.

### Portal separation

The existing `/editor-portal/:editorName` is video-specific today. I will create a separate route for photo editors so both systems stay clean, for example:

- `/photo-editor-portal/:editorName`

### Stage ordering in editor page

The photo editor page will keep your requested summary cards and a grouped task list, but will use the photo stage order only.

### Sync to sheets

I need to verify whether you want photo edits pushed to sheets the same way as video edits. The current video tracker already invokes the heavy Google Sheets function, which has timeout risk. I will keep the photo tracker functional even if sheet sync is deferred or disabled initially.

## Expected result

After implementation:

- **Photo Edit Tracker** opens as a real module from `/photo-edit`
- photo rows auto-appear from photo deliverables
- rows for events up to **Chaitra 2082** land straight in **Finalized**
- dashboard / classic / pipeline views match the current tracker style
- active / paused / on queue / available editor sections remain
- deadlines remain
- photo editors get their own portal page
- **Current / Next Up / Last Finalized / Finalized / Re-Edits** appear inside the photo editor page

## One important implementation choice

To keep this stable and fast, I will **not** connect the new photo tracker to the existing Google Sheets edge function in the first pass unless the current sheet path is clearly defined and safe. The main tracker UI, database flow, and editor portal will work first; external sync can be added after that without blocking the module.