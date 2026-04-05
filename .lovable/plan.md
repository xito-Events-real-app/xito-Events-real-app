

# Fix Domain Typo: `busines` → `business`

The current URLs use `busines.xitoevents.com` (missing an 's'). That's why DNS couldn't resolve it — the domain doesn't exist. The correct domain is `business.xitoevents.com`.

## Changes

Update 3 files, replacing `busines.xitoevents.com` with `business.xitoevents.com`:

| File | Occurrences |
|------|-------------|
| `src/lib/client-contact-api.ts` | 2 (client form URL + client portal URL) |
| `src/components/suite/AllClientsCrewTable.tsx` | 1 (crew schedule URL) |
| `src/components/video-edit/DesktopVideoEditTracker.tsx` | 1 (editor portal URL) |

This is a simple find-and-replace of `busines.xitoevents.com` → `business.xitoevents.com` across all four occurrences.

**Note:** The domain `business.xitoevents.com` must be connected to this project via **Project Settings → Domains** for the links to work. If it's not set up yet, we'll need to do that after this change.

