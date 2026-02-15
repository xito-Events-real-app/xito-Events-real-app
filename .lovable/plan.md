

# Fix: Crew Schedule Link Using First Name Instead of Full Name

## Problem

In `AllClientsCrewTable.tsx`, the WhatsApp share link for the crew schedule uses only the **first word** of the freelancer's name:

```
const firstName = name.trim().split(/\s+/)[0];
```

So "SAFAL KC" becomes "SAFAL", and the link `/crew-schedule/SAFAL` matches zero assignments because the exact-match filter (correctly) finds no freelancer named just "SAFAL".

## Fix

**File: `src/components/suite/AllClientsCrewTable.tsx` (line 903-904)**

Replace `firstName` with the **full name** so the link matches exactly:

```typescript
// Before:
const firstName = name.trim().split(/\s+/)[0];
const scheduleUrl = `https://wtnclienttracker.lovable.app/crew-schedule/${encodeURIComponent(firstName)}`;

// After:
const scheduleUrl = `https://wtnclienttracker.lovable.app/crew-schedule/${encodeURIComponent(name.trim())}`;
```

This is a one-line change. The full name ("SAFAL KC") will now be encoded in the URL, and the exact-match filter on the schedule page will find all the correct assignments.

## Impact

- "SAFAL KC" link will correctly show 8+ booked dates
- "AJAY ADHIKARI (SAFAL)" link will correctly show its own bookings
- All other freelancer links continue to work as before since they already used full names that happened to be single words

