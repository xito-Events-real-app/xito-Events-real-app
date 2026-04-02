
I’ll adjust the Videos tab to behave correctly, with one important constraint: browsers and YouTube embeds do not allow truly forced autoplay with sound in every case. The current mute setting exists because autoplay is usually blocked unless muted. I can improve this so tab entry and video clicks trigger play + unmute as aggressively as possible, but I cannot guarantee sound-autoplay on every browser/device.

Plan

1. Replace the simple iframe swap in `src/components/client-portal/PortalMyVideos.tsx` with a controllable YouTube player setup.
- Use the YouTube player API instead of only changing the iframe `src`.
- On first load of the Videos tab, load the first video and immediately call play + unmute.
- When another playlist item is clicked, load that video and immediately play it without needing a second tap.
- Remove the current forced `mute=1`.

2. Fix the playlist-opening behavior.
- Right now there is no custom playlist link in the code, so the behavior you are seeing is coming from YouTube’s built-in iframe UI.
- That built-in iframe action cannot be forced to open the YouTube app, cannot be forced to use the playlist URL, and cannot be made fully blank-tab-safe by the app.
- To solve this properly, I’ll stop relying on the iframe’s native “Watch on YouTube” behavior and use a controlled app-side action instead.

3. Open the real playlist URL in the same tab.
- Use `https://www.youtube.com/playlist?list={playlistId}`.
- Open it in the same tab/window, not a new tab, so the browser does not leave an empty extra tab behind.
- On supported phones, this gives the device a chance to hand off to the YouTube app; otherwise it opens the playlist page directly.

4. Keep the UI clean.
- Do not bring back the old “Open in YouTube” button in the previous location.
- If a direct playlist-open action is still needed, attach it subtly to the playlist title/header area instead of the removed button.
- Keep the first video selected automatically and the playlist list below the player.

Technical notes
```text
Current causes:
- `mute=1` is still present in the embed URL.
- No custom playlist URL exists in the current source.
- The blank page is caused by external/new-tab style navigation, not by playlist data loading.
```

Files to update
- `src/components/client-portal/PortalMyVideos.tsx`
  - switch to controlled YouTube player logic
  - remove forced mute
  - use same-tab playlist navigation
  - avoid depending on YouTube iframe native external-link behavior
- `src/pages/ClientPortal.tsx`
  - only if needed, pass a small signal when the Videos tab becomes active so first-play can trigger more reliably

Expected result
- First video starts as soon as the user opens the Videos tab, with immediate unmute attempted.
- Clicking another video starts it directly without another play press.
- Playlist opening uses the real playlist link.
- No extra blank browser tab is created.
- Remaining limitation: some browsers may still block first-load sound until they treat the tab change as a valid user gesture, but video clicks will still start directly with sound.
