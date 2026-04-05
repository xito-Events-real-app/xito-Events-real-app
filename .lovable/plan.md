

# Fix YouTube Upload Showing "Failed" After Successful Transfer

## Problem
YouTube's resumable upload API sometimes returns a non-2xx status (typically 503) or triggers a network error after all bytes have been received. The current code treats any non-2xx response as a failure, even when 100% of bytes were transferred. The database shows multiple sessions with `bytes_uploaded == file_size_bytes` but `status = failed`.

## Solution
Add a **retry mechanism** that checks upload status with YouTube when all bytes were sent but the response was not 2xx. YouTube's resumable upload protocol supports status checks by sending `Content-Range: bytes */{total_size}` — a 200/201 response means the upload completed and contains the video metadata.

## File to Modify

**`src/contexts/YouTubeUploadContext.tsx`**

### Change 1: Add a status-check helper function (~line 204)
Create an async function `checkUploadStatus(uploadUri, fileSize)` that:
- Sends a PUT request with `Content-Range: bytes */{fileSize}` header
- If response is 200/201, parses the JSON body to get `videoId`
- Returns `{ completed: true, videoId }` or `{ completed: false }`

### Change 2: Modify `xhr.onload` error path (lines 313-318)
When `xhr.status` is NOT 2xx but all bytes were sent (`startByte + fileSlice.size >= job.file.size`):
- Wait 3 seconds, then call `checkUploadStatus`
- If completed, proceed with the normal success flow (mark completed, add to playlist, etc.)
- If still not completed, retry once more after 5 seconds
- Only mark as failed after retries are exhausted

### Change 3: Modify `xhr.onerror` path (lines 322-328)
Same retry logic: if `job.bytesUploaded >= job.file.size * 0.99` (99%+ uploaded), attempt status check before marking failed.

### Change 4: Improve `xhr.onload` success path JSON parsing (lines 236-244)
Add a fallback: if `xhr.responseText` is empty but status is 2xx, do a status check to get the video ID.

## Technical Details
- YouTube resumable upload status check: `PUT {uploadUri}` with header `Content-Range: bytes */{totalSize}`
- Response 200/201 = complete (body has video resource JSON)
- Response 308 = incomplete (Range header shows bytes received)
- Max 2 retries with 3s and 5s delays to avoid quota issues

