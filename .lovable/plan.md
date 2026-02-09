

## Remove Old Edit Form from Client Detail Page

### What Changes

When you tap the "Edit" (pencil) button on a client's detail page, instead of opening the old inline form, it will navigate to the **Quick Add** page pre-filled with the client's existing data. This makes Quick Add the single universal form for both adding new clients and editing existing ones.

### How It Works

```text
Current Flow:
  Client Detail -> Click Edit -> Old inline form opens (duplicate code)

New Flow:
  Client Detail -> Click Edit -> Navigates to /client-tracker/quick-add?edit=true
                                 with client data passed via navigation state
                                 -> Same QuickAdd form, pre-filled with existing data
                                 -> On save, updates client and navigates back
```

### Technical Details

**1. QuickAdd.tsx - Add Edit Mode Support**
- Detect edit mode via URL search param (`?edit=true`) and navigation state containing the client data
- Pre-fill all form fields from the passed client data (same logic currently in `handleEdit` in ClientDetail.tsx)
- Change the submit handler: if editing, call `updateClient()` instead of `addClient()`
- Change page title to "Edit Client" when in edit mode
- After successful save, navigate back to the client detail page
- Trigger `refetchEventDetails` via cache invalidation events after save

**2. ClientDetail.tsx - Remove Inline Edit Form**
- Remove ~25 edit-related state variables (lines 142-168): `isEditing`, `isSaving`, `editedClient`, `clientLocation`, `currentCountry`, `contactNo`, `whatsappNo`, `eventLocation`, `eventCity`, `selectedDates`, `eventsByDate`, `source`, `whoAdded`, `clientHandler`, `inquiryDate`, `descriptionInput`, `emailInput`, `clientNameInput`, etc.
- Remove helper functions: `handleEdit`, `handleCancel`, `handleSave`, `resetFormState`, `parseSource`, `parseEventCity`, `getEventCityValue`, `getSourceValue`, `parseExistingDates`, `getDateKey`, `handleClientLocationChange`, `handleCountryChange`, `getCityOptions`
- Remove the entire inline edit form render block (lines 1204-1413)
- Replace `handleEdit` with a simple navigation: navigate to `/client-tracker/quick-add?edit=true` passing the client data in state
- Remove unused imports that were only needed for the edit form (FormSection, FormInput, FormSelect, CountrySelector, NepaliCalendar, EventSelector, PhoneInputField, etc.)

**3. Files Changed**

| File | Change |
|------|--------|
| `src/pages/QuickAdd.tsx` | Add edit mode: detect edit state, pre-fill form, call updateClient on save, navigate back |
| `src/pages/ClientDetail.tsx` | Remove inline edit form, edit state variables, and helper functions. Replace edit button with navigation to QuickAdd |

This removes hundreds of lines of duplicated code from ClientDetail.tsx and establishes QuickAdd as the single source of truth for client form editing.
