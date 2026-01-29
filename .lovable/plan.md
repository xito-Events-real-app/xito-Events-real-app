

## Auto-Sync Vendor Changes to Client Event Details

### Current Problem

When you update vendor details in sheets like "BANQUET" or "MAKEUP STUDIO" (e.g., adding City for "Makeup by Niru"), the client page doesn't reflect these changes because:

1. Client event details are stored in "BOOKED CLIENTS EVENT DETAILS" sheet with venue/parlour data copied at the time of selection
2. There's no automatic sync from vendor sheets back to client records
3. The data is stored separately - vendor info isn't dynamically linked

### Solution Architecture

```text
+-------------------+           +--------------------------------+
| MAKEUP STUDIO     |   Sync    | BOOKED CLIENTS EVENT DETAILS   |
| Sheet             |  ======>  | Sheet                          |
+-------------------+           +--------------------------------+
| Makeup by Niru    |           | NIBISHA MA'AM : PRARTHANA      |
| City: KATHMANDU   |  ------>  | ParlourName: Makeup by Niru    |
| Area: CHABAHIL    |           | ParlourCity: KATHMANDU         |
| Map: https://...  |           | ParlourArea: CHABAHIL          |
+-------------------+           +--------------------------------+
```

### Implementation Approach

There are two approaches to solve this:

#### Approach 1: Auto-Refresh on Page Load (Recommended)
When the Client Detail page loads event details, automatically check if the selected venue/parlour has updated data in the vendor sheet and refresh if different.

**Pros:**
- No manual sync needed
- Always shows latest data
- Low complexity

**Cons:**
- Slightly slower page load (extra API call)
- Only updates when client page is viewed

#### Approach 2: Bulk Sync Action (Master Sync Enhancement)
Add a step to Master Sync that updates all client event details with the latest vendor data from the vendor sheets.

**Pros:**
- Updates all clients at once
- Can be scheduled/triggered manually

**Cons:**
- Requires running Master Sync
- More complex to implement

---

### Recommended: Approach 1 - Auto-Refresh on Page Load

#### Changes Required

##### 1. Backend: New Edge Function Action

**File: `supabase/functions/google-sheets/index.ts`**

Add new action: `refreshClientVendorData`

This action will:
1. Get the client's event details from "BOOKED CLIENTS EVENT DETAILS"
2. For each event with a venue/parlour:
   - Look up the venue in its type-specific sheet (e.g., "BANQUET")
   - Look up the parlour in its type-specific sheet (e.g., "MAKEUP STUDIO")
   - Compare City, Area, Map with stored values
   - Update the EVENT DETAILS sheet if different

```typescript
async function refreshClientVendorData(
  accessToken: string, 
  spreadsheetId: string, 
  registeredDateTimeAD: string
) {
  // 1. Get client's event details
  const clientData = await getClientEventDetails(accessToken, spreadsheetId, registeredDateTimeAD);
  
  // 2. For each event, check and refresh vendor data
  for (const event of clientData.events) {
    let hasChanges = false;
    const updates: Record<string, string> = {};
    
    // Check venue data
    if (event.venueType && event.venueName) {
      const venues = await getVenuesByType(accessToken, spreadsheetId, event.venueType);
      const matchingVenue = venues.find(v => v.name.toLowerCase() === event.venueName.toLowerCase());
      
      if (matchingVenue) {
        if (matchingVenue.city !== event.venueCity) {
          updates.venueCity = matchingVenue.city;
          hasChanges = true;
        }
        if (matchingVenue.area !== event.venueArea) {
          updates.venueArea = matchingVenue.area;
          hasChanges = true;
        }
        if (matchingVenue.googleMap !== event.venueMap) {
          updates.venueMap = matchingVenue.googleMap;
          hasChanges = true;
        }
      }
    }
    
    // Check parlour data
    if (event.parlourType && event.parlourName) {
      const parlours = await getParloursByType(accessToken, spreadsheetId, event.parlourType);
      const matchingParlour = parlours.find(p => p.name.toLowerCase() === event.parlourName.toLowerCase());
      
      if (matchingParlour) {
        if (matchingParlour.city !== event.parlourCity) {
          updates.parlourCity = matchingParlour.city;
          hasChanges = true;
        }
        if (matchingParlour.area !== event.parlourArea) {
          updates.parlourArea = matchingParlour.area;
          hasChanges = true;
        }
        if (matchingParlour.googleMap !== event.parlourMap) {
          updates.parlourMap = matchingParlour.googleMap;
          hasChanges = true;
        }
      }
    }
    
    // Update if changes found
    if (hasChanges) {
      await updateClientEventDetails(accessToken, spreadsheetId, registeredDateTimeAD, event.eventIndex, updates);
    }
  }
  
  return { success: true, refreshed: true };
}
```

##### 2. Frontend: New API Function

**File: `src/lib/event-venue-api.ts`**

Add function to call the refresh action:

```typescript
export async function refreshClientVendorData(registeredDateTimeAD: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: {
      action: 'refreshClientVendorData',
      data: { registeredDateTimeAD }
    }
  });
  
  if (error) throw new Error(error.message);
  return data?.success || false;
}
```

##### 3. Frontend: Hook Enhancement

**File: `src/hooks/useEventDetails.ts`**

Modify `fetchEventDetails` to refresh vendor data before returning:

```typescript
const fetchEventDetails = useCallback(async () => {
  if (!registeredDateTimeAD) return;

  setIsLoading(true);
  setError(null);

  try {
    // Step 1: Refresh vendor data (auto-sync from vendor sheets)
    await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'refreshClientVendorData',
        data: { registeredDateTimeAD }
      }
    });
    
    // Step 2: Fetch the (now-updated) event details
    const { data: result, error: fetchError } = await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'getClientEventDetails',
        data: { registeredDateTimeAD }
      }
    });

    if (fetchError) throw new Error(fetchError.message);
    if (!result?.success) throw new Error(result?.error || 'Failed to fetch event details');

    setData(result.data);
  } catch (err) {
    // ... error handling
  } finally {
    setIsLoading(false);
  }
}, [registeredDateTimeAD]);
```

---

### User Experience Flow

1. You edit "Makeup by Niru" in the "MAKEUP STUDIO" sheet and add City: KATHMANDU
2. You navigate to NIBISHA MA'AM : PRARTHANA's Client Detail page
3. On page load, the system:
   - Detects that Parlour Name is "Makeup by Niru" with Parlour Type "MAKEUP STUDIO"
   - Looks up "Makeup by Niru" in the "MAKEUP STUDIO" sheet
   - Finds City: KATHMANDU is different from the stored value (empty)
   - Updates "BOOKED CLIENTS EVENT DETAILS" with the new City
4. The Client page now shows City: KATHMANDU in the Parlour section

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `refreshClientVendorData` action |
| `src/lib/event-venue-api.ts` | Modify | Add `refreshClientVendorData` function |
| `src/hooks/useEventDetails.ts` | Modify | Call refresh before fetching event details |

---

### Technical Notes

- **Performance**: The refresh is called once per client page load, checking only that client's events
- **Matching Logic**: Uses case-insensitive name matching to find the vendor in the type sheet
- **Fields Synced**: City, Area, and Map Link from venue/parlour sheets
- **Non-destructive**: Only updates if vendor sheet has a value and it differs from stored value
- **Silent Operation**: Runs in background without user notification unless errors occur
- **Cache Invalidation**: The venue/parlour hooks already fetch fresh data, so dropdowns will show updated info

---

### Optional Enhancement: Master Sync Integration

To also update all clients during Master Sync, add a Phase 4 to the sync process that:
1. Gets all clients from "BOOKED CLIENTS EVENT DETAILS"
2. For each client, runs `refreshClientVendorData`
3. Reports how many client records were updated

This would be added to `MasterSyncButton.tsx` as an additional sync phase.

