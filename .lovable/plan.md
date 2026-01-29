
# Fix Domain Mismatch in Client Form URLs

## The Problem

Your code is generating form URLs with the wrong domain:
- **Current (wrong):** `forms.bookedclientscontactdetails.com.chickenkiller.com`
- **Correct (matching your DNS):** `forms.bookedclientscontactdetails.chickenkiller.com`

## The Fix

Update the `getClientFormUrl` function in `src/lib/client-contact-api.ts` to use the correct domain.

## Changes Required

**File:** `src/lib/client-contact-api.ts`

| Line | Current | Updated |
|------|---------|---------|
| 78 | `https://forms.bookedclientscontactdetails.com.chickenkiller.com/client-form/...` | `https://forms.bookedclientscontactdetails.chickenkiller.com/client-form/...` |

## What This Affects

All client form links shared via:
- "Copy Link" button
- "Send to WhatsApp" button

## After This Change

1. Wait for DNS verification to complete (status changes from "Verifying" to "Active")
2. Test a form link to ensure it loads correctly
3. New WhatsApp messages will use the correct domain

## Technical Details

```typescript
// Before
return `https://forms.bookedclientscontactdetails.com.chickenkiller.com/client-form/${encodedId}`;

// After
return `https://forms.bookedclientscontactdetails.chickenkiller.com/client-form/${encodedId}`;
```
