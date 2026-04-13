

# Fix "Expand All" showing incomplete information

## Problem
When clicking "Expand All" in the All Clients crew table, most rows show "No details configured for this event's freelancers" or only minimal info. This happens because `EventLogisticsPanel` gates venue/bride/groom/parlour display behind `freelancer_event_settings` flags (`show_bride_details`, `show_venue_details`, etc.). Those settings are per-freelancer visibility toggles meant for the crew schedule — not for the admin overview.

Only events where freelancer settings have been individually configured show their details. That is why "only Baisakh 1" shows info — it is the only one with settings configured.

## Solution
In the admin "All Clients" view, always show all available information (venue, parlour, bride, groom contacts) when expanded, ignoring the freelancer-specific visibility settings.

### Changes in `src/components/suite/AllClientsCrewTable.tsx`

**`EventLogisticsPanel`** (around line 1596):
- When `localSettings` is empty (no freelancer settings configured), default all visibility flags to `true` so venue, parlour, bride, and groom info always shows
- Change the logic from:
  ```
  const showBride = localSettings.some(s => s.show_bride_details);
  ```
  To:
  ```
  const noSettings = localSettings.length === 0;
  const showBride = noSettings || localSettings.some(s => s.show_bride_details);
  const showVenue = noSettings || localSettings.some(s => s.show_venue_details);
  // etc for all flags
  ```
- This ensures that when no per-freelancer settings exist, all available event/contact data is displayed
- When settings DO exist, the current behavior is preserved

### File changed
- `src/components/suite/AllClientsCrewTable.tsx` — 6 lines changed in `EventLogisticsPanel`

