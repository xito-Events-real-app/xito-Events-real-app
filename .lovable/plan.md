

# Pause, Cancel & Delete for XITO Drive and pCloud Uploads

## Overview

Add pause/cancel controls to ongoing uploads in both XITO Drive and pCloud, plus a delete-from-folder option in XITO Drive's file browser.

## Current Architecture

Both upload systems use sequential processing loops inside their contexts. Uploads use `XMLHttpRequest` (XHR) for progress tracking. There's no mechanism to abort or pause mid-upload. XITO Drive already has `deleteE2Object` in `idrive-e2-api.ts` but it's not exposed in the drive browser UI.

## Plan

### 1. Add Pause/Cancel to XITO Drive Uploads

**`src/contexts/XitoDriveUploadContext.tsx`**:
- Add a `paused` ref and `cancelledJobs` set to track state
- Store the active XHR instance in a ref so it can be aborted
- Modify `uploadToE2` to accept an `AbortSignal` or return an abort handle — instead, store XHR ref in context
- Add `pauseSession`, `resumeSession`, `cancelJob`, `cancelSession` methods to the context
- When paused: after current file completes, stop processing next files
- When cancelled: abort current XHR, mark remaining pending jobs as `'cancelled'` status
- Add `'cancelled'` and `'paused'` to the job status type

**`src/lib/idrive-e2-api.ts`**:
- Modify `uploadToE2` to accept an optional `AbortController` signal, call `xhr.abort()` when signaled

**`src/components/xito-drive/XitoUploadTracker.tsx`**:
- Add Pause/Play and Cancel (X) buttons in the session header
- Show paused state with a yellow indicator
- Cancelled jobs show a grey "cancelled" badge

### 2. Add Pause/Cancel to pCloud Uploads

**`src/contexts/PCloudUploadContext.tsx`**:
- Same pattern: add `paused` ref, `cancelledJobs` set, store active XHR ref
- Add `pauseUpload`, `resumeUpload`, `cancelAll`, `cancelJob` methods
- Add `'cancelled'` status type

**`src/lib/pcloud-api.ts`**:
- Modify `uploadToPCloudByPath` to accept an optional `AbortController` signal

**`src/components/pcloud-drive/PCloudUploadTracker.tsx`**:
- Add Pause/Play and Cancel buttons in the tracker header
- Per-job cancel button (X icon) for pending/uploading jobs

### 3. Add Delete Files from XITO Drive Folders

**`src/components/xito-drive/XitoDriveBrowser.tsx`**:
- At the leaf/file level where E2 files are listed, add a delete button (Trash icon) per file
- Show a confirmation dialog before deleting
- Call `deleteE2Object(file.key)` on confirm
- Refresh the file list after deletion
- Log the deletion to `xito_activity_log` with `action_type: 'delete'`

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/idrive-e2-api.ts` | Add `AbortController` support to `uploadToE2` |
| `src/lib/pcloud-api.ts` | Add `AbortController` support to `uploadToPCloudByPath` |
| `src/contexts/XitoDriveUploadContext.tsx` | Add pause/cancel state and methods |
| `src/contexts/PCloudUploadContext.tsx` | Add pause/cancel state and methods |
| `src/components/xito-drive/XitoUploadTracker.tsx` | Add pause/cancel UI buttons |
| `src/components/pcloud-drive/PCloudUploadTracker.tsx` | Add pause/cancel UI buttons |
| `src/components/xito-drive/XitoDriveBrowser.tsx` | Add delete button per file with confirmation |

