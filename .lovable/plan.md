
# Freelancer Profile Page with Booking Calendar

## What You'll Get

A dedicated page for each freelancer at `/freelancer/:freelancerName` that shows:
1. **Full profile details** -- name, contact, social links, location, roles/skills
2. **A personalized booking calendar** -- 12-month view showing only the dates THIS freelancer is assigned to events
3. **Hover popups on booked dates** -- showing client name, event name, role assigned, and venue details

Clicking on any freelancer name (in the Dashboard Event Details column, in the Assignment dropdowns, or in the Freelancers module table) will navigate to this page.

---

## How It Works

```text
User clicks "Ram Sharma" anywhere in the app
        |
        v
  /freelancer/Ram%20Sharma
        |
        v
  Page loads:
    1. Fetches freelancer profile from WTN FREELANCERS sheet (by name match)
    2. Fetches ALL rows from BOOKED CLIENTS FREELANCERS sheet
    3. Scans every row + every event index for this freelancer's name
    4. Builds a calendar map: date -> [{ clientName, event, role, venue }]
        |
        v
  Renders:
    - Left: Profile card (details, contact, roles)
    - Right: 12-month booking calendar with green dots on booked dates
    - Hover on date: popup showing event details for that day
```

---

## Technical Details

### Step 1: New Backend Action -- `getFreelancerBookings`

**File: `supabase/functions/google-sheets/index.ts`**

Add a new action that:
- Reads ALL rows from `BOOKED CLIENTS FREELANCERS` sheet (A2:R1000)
- For each row, splits all columns by `\n` and checks each event index
- If any column I-R at a given index matches the freelancer name, collect:
  - `clientName` (Col C), `event` (Col D at index), `eventDateAD` (Col H at index), `eventMonth` (Col F at index), `eventDay` (Col G at index), `eventYear` (Col E at index), `role` (which column matched), `registeredDateTimeAD` (Col A)
- Returns the full list of bookings for this freelancer

### Step 2: New API Function

**File: `src/lib/freelancer-assignment-api.ts`**

Add `getFreelancerBookings(freelancerName: string)` that calls the new backend action and returns typed booking data.

### Step 3: New Page Component -- `FreelancerProfile`

**File: `src/pages/FreelancerProfile.tsx`**

- Route param: `freelancerName` (URL-decoded)
- Fetches freelancer details from `getFreelancers()` (find by name)
- Fetches bookings from `getFreelancerBookings(name)`
- Layout:
  - **Left column (1/3)**: Profile card with name, main job badge, contact info (call/WhatsApp links), social links (Instagram/Facebook), location (city/area), map link, and role badges (color-coded chips for each YES role)
  - **Right column (2/3)**: 12-month booking calendar similar to `BookingCalendarMini` but using the freelancer's personal booking data instead of all clients. Each booked date gets an emerald circle. Hovering shows a popup with client name, event type, role assigned, and venue info. Clicking a client name in the popup navigates to their detail page.

### Step 4: Route Registration

**File: `src/App.tsx`**

Add route: `<Route path="/freelancer/:freelancerName" element={<ProtectedRoute><FreelancerProfile /></ProtectedRoute>} />`

### Step 5: Make Freelancer Names Clickable

Three files need freelancer names wrapped in links:

1. **`src/components/client-detail/DashboardEventDetails.tsx`** -- The freelancer names in the third column become clickable links to `/freelancer/{name}`
2. **`src/components/client-detail/FreelancerAssignmentSection.tsx`** -- The selected freelancer name in each dropdown trigger becomes a clickable link
3. **`src/components/freelancers/FreelancerTable.tsx`** -- The name column in the freelancers module table becomes clickable

All links use `useNavigate` to go to `/freelancer/${encodeURIComponent(name)}`.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add `getFreelancerBookings` action |
| `src/lib/freelancer-assignment-api.ts` | Add `getFreelancerBookings()` API call |
| `src/pages/FreelancerProfile.tsx` | New page with profile + booking calendar |
| `src/App.tsx` | Add `/freelancer/:freelancerName` route |
| `src/components/client-detail/DashboardEventDetails.tsx` | Make freelancer names clickable |
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Make assigned names clickable |
| `src/components/freelancers/FreelancerTable.tsx` | Make name column clickable |
