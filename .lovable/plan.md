
Goal: Make Deliverables show real switches (like Freelancers section style) and ensure all requested controls are visible for every event.

What I found:
- The page is rendering event headers (so events load), but switch rows are missing because each switch row only renders if a matching `client_deliverables` row exists.
- In `DeliverablesSection`, default bootstrap insert mixes objects with and without `album_name`. Since `album_name` is NOT NULL in `client_deliverables`, the batch can fail and no rows are created.
- Insert error is not currently handled (`const { data: inserted } = ...` without checking `error`), so failure appears as “blank rows” instead of a clear error.
- Deliverables visual style is currently dark; you asked it to look like the Freelancers section UI.

Implementation plan:

1) Fix missing-switch data bootstrap (core bug)
- Update `src/components/client-detail/DeliverablesSection.tsx` default insert builders so every inserted row includes all NOT NULL text fields (especially `album_name: ''`, plus existing required fields).
- Add proper insert error handling:
  - capture `{ data, error }` from insert
  - show destructive toast on error
  - log exact database error for debugging
- After insert, re-fetch deliverables for that client and set state from DB result (prevents partial/local mismatch).
- Keep existing defaults exactly as requested:
  - Photos: all_photos ON, selected_photos OFF, insta_post OFF
  - Videos: full_video ON, highlights ON (qty 1 + default name `EVENT NAME HIGHLIGHTS`), reel OFF, video_insta_post OFF
  - Overall/Album/Pendrive+Frame defaults preserved.

2) Match Freelancers-style UI presentation
- Restyle Deliverables container/cards to follow Freelancer section pattern (light card surfaces, readable dark text, same spacing rhythm, similar row structure).
- Keep current deliverables logic, but make switch rows visually consistent with Freelancers:
  - clear label + control alignment
  - same switch size behavior
  - consistent typography and paddings
- Preserve event grouping and two-column Photos/Videos layout under each event.

3) Complete/align requested controls
- Ensure all requested sections appear after event cards:
  - OVERALL: overall highlights + overall reel (multi-item with qty and names)
  - ALBUM: bride, groom, other (other asks album name first, then album type entries)
  - PENDRIVE & FRAME: quantity-only controls
- Keep plus/minus and per-item naming for insta/highlights/reel-like items.

4) Navigation consistency
- Add `deliverables` to mobile section tabs in `ClientDetail.tsx` (desktop sidebar already has it), so behavior is consistent across devices.

5) Verification checklist (post-fix)
- Open a client with multiple events:
  - confirm each event now shows visible switch rows under Photos/Videos
  - toggle ON/OFF and reload page: state persists
  - highlights defaults to `EVENT NAME HIGHLIGHTS`
  - album “Other” accepts album name + per-type names
  - pendrive/frame quantity updates and persists
- Confirm no insert 400 errors occur when first opening Deliverables for a client.
