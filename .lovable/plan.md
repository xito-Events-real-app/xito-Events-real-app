

## Editor View Fixes + Auto-Running on Progress Move

### Changes

**1. Auto-set `is_playing = true` when moving to EDIT_ON_PROGRESS** (`src/lib/video-edit-api.ts`)
- In `pushToStatus`, when `newStatus` is `EDIT_ON_PROGRESS`, also set `is_playing: true` and `playing_since: new Date().toISOString()` so the timer starts running immediately.

**2. Fix "Set Next Edit" not updating