

# Album Copy History + Info Copy Button + Gear Redesign

## What gets built

1. **Database table** `album_copy_history` to persist copy results so the gear always shows the last copy status
2. **Post-copy state** restored from DB on load — if photos were already copied, gear shows the result immediately
3. **"Copy Information" button** that copies a formatted summary to clipboard (client name, month, albums with counts, pCloud link)
4. **Gear redesign**: background matches the page dark color (`hsl(220,25%,8%)`), copy result info displayed on left and right sides of the gear instead of inside/below

## Technical details

### 1. New table: `album_copy_history`
```sql
CREATE TABLE album_copy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL UNIQUE,
  client_name text NOT NULL DEFAULT '',
  month_folder text NOT NULL DEFAULT '',
  albums_copied jsonb NOT NULL DEFAULT '[]',
  total_copied integer NOT NULL DEFAULT 0,
  total_expected integer NOT NULL DEFAULT 0,
  errors text[] NOT NULL DEFAULT '{}',
  copied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE album_copy_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON album_copy_history FOR ALL USING (true) WITH CHECK (true);
```

`albums_copied` stores: `[{ "album_type": "bride_album", "folder_name": "BRIDE ALBUM", "count": 140 }, ...]`

### 2. Save copy result after `executeCopy` completes
- Insert/upsert into `album_copy_history` with the copy result details
- On component mount, fetch from `album_copy_history` for this client — if exists, set `copyStatus='done'` and `copyResult` immediately

### 3. Gear layout redesign
- Gear background: `bg-[hsl(220,25%,8%)]` with subtle border — matches page background
- Layout changes from vertical stack to horizontal: `[Left Info] [Gear] [Right Info]`
  - Left side: album names + counts (e.g., "BRIDE ALBUM: 140", "GROOM ALBUM: 140")
  - Right side: status text + date copied
- Gear stays centered, smaller text flanks it

### 4. "Copy Information" button
- Small button below the gear area, visible only when `copyStatus === 'done'`
- On click, builds text like:
  ```
  Client: KARISHMA SHRESTHA
  Month: FALGUN EVENTS 2082
  Albums: BRIDE ALBUM (140), GROOM ALBUM (140)
  Total: 280 photos
  pCloud: pcloud://folder/ALBUM AND FRAME - WEDDING TALES NEPAL/FALGUN EVENTS 2082/KARISHMA SHRESTHA
  ```
- Copies to clipboard with toast "Information copied!"

### Files changed
- **Migration**: new `album_copy_history` table
- **`src/components/client-detail/AlbumSection.tsx`**: load history on mount, save after copy, redesigned gear layout, copy info button

