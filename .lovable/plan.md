

# XITO TRANSFER Module

## What It Does
A temporary transfer space for files (< 20MB), text notes, and URLs. Everything auto-deletes after 7 days. Items grouped by date (Today, Tomorrow, then "4 April 2026 / 22 Chaitra 2082" format). Accessible globally by pressing X twice.

## Database

### New table: `xito_transfers`
```sql
CREATE TABLE public.xito_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  transfer_type text NOT NULL DEFAULT 'note',  -- 'note' | 'file' | 'url'
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',              -- for URL type transfers
  url_description text NOT NULL DEFAULT '',  -- optional label for the URL
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
-- Public RLS + Realtime enabled
```

### New storage bucket: `xito-transfers` (public, 20MB limit enforced client-side)

### Cleanup Edge Function: `cleanup-xito-transfers`
Same pattern as `cleanup-potential-deletes` — deletes expired rows + associated storage files.

## Three Transfer Types

1. **Note** — title + text content
2. **File** — upload file (< 20MB), stored in `xito-transfers` bucket
3. **URL** — save a URL with optional description/label; rendered as clickable link with favicon preview

## Module Registration
`src/lib/suite-modules.ts` — add `xito-transfer` entry ABOVE `client-tracker` with `ArrowUpDown` icon, path `/xito-transfer`.

## New Page: `src/pages/XitoTransfer.tsx`
- Top bar: icon + "XITO TRANSFER" + back
- Three add buttons: Note, File, URL
- Items grouped by date: **Today** / **Tomorrow** / formatted date headers
- Each item shows: type icon, title, preview, time ago, days-remaining badge, delete
- Files downloadable on click; URLs open in new tab
- Desktop: sidebar with date list; Mobile: scrollable list

## Double-X Global Shortcut
**New context: `src/contexts/XitoTransferPopupContext.tsx`** — same pattern as `SaugatSearchContext` double-space, but listens for "x" key twice within 400ms.

**New component: `src/components/shared/FloatingXitoTransfer.tsx`** — floating overlay with the full XITO TRANSFER UI.

## Routing
`src/App.tsx` — protected route `/xito-transfer`, provider + floating component added globally.

## Files Summary

| File | Action |
|------|--------|
| DB migration | Create `xito_transfers` table + `xito-transfers` bucket |
| `src/lib/suite-modules.ts` | Add module above Client Tracker |
| `src/pages/XitoTransfer.tsx` | Create — main page |
| `src/contexts/XitoTransferPopupContext.tsx` | Create — double-X listener |
| `src/components/shared/FloatingXitoTransfer.tsx` | Create — floating overlay |
| `supabase/functions/cleanup-xito-transfers/index.ts` | Create — auto-delete expired |
| `src/App.tsx` | Add route + provider + floating component |

