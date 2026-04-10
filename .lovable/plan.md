
Problem found:
- The hide table is still empty: `portal_hidden_videos` has no rows right now, so the unlink action is not actually being saved.
- The failure is happening on the YouTube Dashboard side, not on the Client Portal filter side.
- There is also a React warning on this exact confirmation dialog path (`Function components cannot be given refs` in `YouTubeDashboard`), so the confirm flow is unstable.
- Even when the portal-side filter is correct, the portal only refreshes its hidden-video list on load, so verification can feel inconsistent unless the page reloads.

Fix plan:
1. Stabilize the confirmation flow in `src/components/suite/YouTubeDashboard.tsx`
   - Replace the current fragile confirm action flow with a fully controlled confirm dialog.
   - Keep the dialog open while saving, disable both buttons during the request, and only close it after a confirmed successful save.
   - Add a hard guard so unlink cannot run if the selected video has no resolved client/tracker link.

2. Make unlink/relink persistence verifiable
   - Change unlink and relink handlers to verify the database result instead of only flipping local state.
   - After unlink: save, then immediately re-read `portal_hidden_videos` for that client + video and update `isVideoHidden` from the database result.
   - After relink: delete, then re-read and confirm the row is gone.
   - Show exact error toasts when save/delete fails.

3. Fix the dialog-related bug/warning
   - Clean up the AlertDialog usage in `YouTubeDashboard` so it no longer triggers the ref warning seen in console.
   - If needed, switch the action buttons in this dialog to plain controlled buttons instead of relying on the Radix auto-close action path.

4. Make portal verification reliable
   - Update `src/components/client-portal/PortalMyVideos.tsx` to refresh hidden-video state not only on first mount, but also when the tab/page becomes active again.
   - This makes “unlink → open client portal → verify” behave consistently without stale data confusion.

5. End-to-end verification after fix
   - Test with one known video that has a resolved `registered_date_time_ad`.
   - Confirm row appears in `portal_hidden_videos`.
   - Confirm the same video disappears from the client portal video page.
   - Confirm “Re-link to Client Portal” removes the row and the video appears again.

Technical notes:
- No new table is needed; `portal_hidden_videos` already exists.
- The main bug is that the dashboard action is not persisting rows reliably.
- Secondary issue: the portal UI can look unchanged until it refreshes its hidden-video query.
