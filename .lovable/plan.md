

## File Tracking Table — Scrollable, Filtered, Reordered Columns

### Problems
1. Table limited to 50 rows with `slice(0, 50)` — needs full scroll
2. No year/month filters inside the file tracking section (user wants NepaliDateFilter style like All Clients page)
3. Column order wrong — needs: Client, Event, Date (Nepali), Freelancer, Role, Card, Copy, Backup, Size, Storage, Updated
4. Date shows AD format — needs Nepali like "Magh 21, 2082"

### Changes

**`src/components/files/FilesDashboard.tsx`**

1. **Make table fully scrollable**: Change `ScrollArea` `max-h-[360px]` to `max-h-[500px]` and remove `slice(0, 50)` — show all `displayFiles`

2. **Add NepaliDateFilter inside the File Tracking card header**: Import `NepaliDateFilter` from `@/components/booked/NepaliDateFilter`. Add `filterYear` and `filterMonth` state. Place the filter inline in the card header bar. Apply year/month filtering on `displayFiles` using `event_year` and `event_month` fields.

3. **Reorder columns to**: Client Name, Event, Date, Freelancer, Role, Card, Copy, Backup, Size, Storage, Updated

4. **Date column**: Convert from `event_date_ad` to Nepali format using `event_month`, `event_day`, `event_year` fields → display as `"Magh 21, 2082"` using `nepaliMonthsEnglish`

5. **New columns**:
   - Freelancer: `f.freelancer_name`
   - Role: `f.freelancer_type`
   - Card: `f.card_label`
   - Storage: `f.backup_1_device_name`

### Files Changed
- `src/components/files/FilesDashboard.tsx`

