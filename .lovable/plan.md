

## Client File Detail Page — Dedicated Route

### What We're Building
A new dedicated page at `/files/client/:registeredDateTimeAD` that shows ALL file information for a specific client. Client names in the dashboard table become clickable links to this page. The page preserves scroll position on the dashboard when navigating back.

### Architecture

```text
/files/client/:registeredDateTimeAD
┌─────────────────────────────────────────────────┐
│ ← Back to Dashboard    CLIENT NAME              │
├─────────────────────────────────────────────────┤
│ SUMMARY CARDS (Nepali dates)                    │
│ Total Size | Copied | Remaining | Double Backup │
├─────────────────────────────────────────────────┤
│ EVENT 1: Mehndi — Magh 4, 2082                  │
│ ┌─ Freelancer rows with file paths, status ──┐  │
│ │ SET PATH / CONFIRMED buttons per row       │  │
│ └────────────────────────────────────────────┘  │
│ EVENT 2: Wedding — Magh 5, 2082                 │
│ ┌─ ...                                      ─┐  │
└─────────────────────────────────────────────────┘
```

### Files to Create

**1. `src/pages/FileClientDetail.tsx`** (~350 lines)
- Route param: `registeredDateTimeAD` (URI-decoded)
- Fetches all `files_management` rows for that client (`registered_date_time_ad` match)
- Also fetches `freelancer_assignments` for the client to show ALL freelancers even if no file row exists yet
- **Header**: Back button (navigates to `/files` preserving dashboard state), client name
- **Summary cards**: Total copied size (GB), files remaining to copy count, double backup status, all dates in Nepali format (`Magh 4, 2082` style using `nepaliMonthsEnglish`)
- **Event sections**: Grouped by event name + date, each showing:
  - Event header with Nepali date
  - Freelancer table: name, type, side, format, size, items count, copy status, backup status, who copied, storage path
  - "Set Path" button opens `FilePathBuilderDialog`
  - "CONFIRMED" clickable opens `ReconfirmationDialog`
  - Inline edits for size, format, items (same as existing tables)
- Dark theme matching dashboard aesthetic

**2. Modify `src/App.tsx`** (line ~96)
- Add route: `<Route path="/files/client/:clientId" element={<ProtectedRoute><FileClientDetail /></ProtectedRoute>} />`

**3. Modify `src/components/files/FilesDashboard.tsx`**
- Make client name in table a clickable link using `useNavigate`
- `navigate(\`/files/client/${encodeURIComponent(f.registered_date_time_ad)}\`)`
- Client name styled as clickable (underline on hover, pointer cursor)
- Store current scroll/search/filter state in `sessionStorage` before navigating so it restores on return

### Key Details
- All dates displayed in Nepali format: `nepaliMonthsEnglish[month-1] + " " + day + ", " + year`
- Back navigation uses `navigate('/files')` — dashboard reads `sessionStorage` to restore search/filter/scroll
- File path builder and confirmation dialogs reused from existing components
- `useStorageDevices()` hook reused for device data
- Updates use existing `updateFileRecord` + `scheduleFilesPush`

### Files Changed
- **New**: `src/pages/FileClientDetail.tsx`
- **Modify**: `src/App.tsx` (add route)
- **Modify**: `src/components/files/FilesDashboard.tsx` (clickable names + state preservation)

