

# Client Contact Form Enhancement Plan

## Overview

This plan implements a shareable public form link system with the following features:

1. **Anonymous Form Page** - Generic greeting "Dear Sir/Ma'am" instead of client name
2. **Send to WhatsApp Button** - Opens WhatsApp with pre-filled message
3. **Copy Link Button** - Copies the unique form URL
4. **Form Sent Status** - Shows "Form sent" badge only when sent via WhatsApp
5. **Thank You Message** - Displays wishes for client events after submission
6. **Form Disclaimer** - Shows "Anyone can fill the form with this link"

---

## Part 1: Public Client Form Page

### New File: `src/pages/ClientContactForm.tsx`

A public-facing form that:
- Uses generic greeting: "Dear Sir/Ma'am" (no client name shown)
- Does NOT reveal Google Sheets backend
- Shows Wedding Tales Nepal branding
- Displays disclaimer: "Anyone can fill the form with this link"
- After submission shows thank you message with event wishes
- Mobile-first design for WhatsApp access

**Form Page UI:**
```text
+========================================+
|     Wedding Tales Nepal                |
|     💍✨                                |
+========================================+
|                                        |
|  Dear Sir/Ma'am,                       |
|                                        |
|  Please fill in your contact details  |
|  to help us coordinate your event.    |
|                                        |
|  ⚠️ Anyone can fill the form with     |
|     this link                          |
|                                        |
+----------------------------------------+
|  👰 BRIDE'S DETAILS                    |
|  [Full form fields...]                 |
+----------------------------------------+
|  🤵 GROOM'S DETAILS                    |
|  [Full form fields...]                 |
+----------------------------------------+
|       [Submit Details]                 |
+----------------------------------------+
|  Contact: 9705255025 / 9749494560     |
+========================================+
```

**Success Screen (After Submission):**
```text
+========================================+
|     Wedding Tales Nepal                |
+========================================+
|                                        |
|      ✓ THANK YOU!                      |
|                                        |
|  Your contact details have been        |
|  submitted successfully.               |
|                                        |
|  🎉 We wish you a beautiful wedding   |
|  filled with love, joy, and           |
|  unforgettable moments!               |
|                                        |
|  May your journey together be         |
|  blessed with happiness! 💕           |
|                                        |
|  Our team will contact you soon.      |
+----------------------------------------+
|  Contact: 9705255025 / 9749494560     |
+========================================+
```

---

## Part 2: Route Configuration

### File: `src/App.tsx`

Add a new public route:
```typescript
import ClientContactForm from "./pages/ClientContactForm";

// In Routes - public form route:
<Route path="/client-form/:clientId" element={<ClientContactForm />} />
```

The `clientId` parameter is the URL-encoded `registeredDateTimeAD`.

---

## Part 3: Schema Update - Add "Form Sent Date" Column

### File: `src/lib/client-contact-api.ts`

Add new field to interface:
```typescript
export interface ClientContactDetails {
  // ... existing fields (A-AA)
  
  // Form tracking (Column AB)
  formSentDate: string;  // ISO date when form link was sent via WhatsApp
}
```

### File: `supabase/functions/google-sheets/index.ts`

Update column range from A:AA to A:AB (28 columns total)
- Column AB (index 27): formSentDate

---

## Part 4: "Send to WhatsApp" and "Copy Link" Buttons

### File: `src/components/client-detail/ClientDetailsCard.tsx`

Add new buttons in the header area with these functions:

**1. Copy Link Button:**
- Generates URL: `https://wtnclienttracker.lovable.app/client-form/{encodedClientId}`
- Copies to clipboard
- Shows toast: "Link copied!"

**2. Send to WhatsApp Button:**
- Generates the WhatsApp message (from your template)
- Opens WhatsApp with the message
- Updates `formSentDate` column to current timestamp
- Shows toast: "Sent to WhatsApp!"

**WhatsApp Message Template:**
```
Hello 👋
Greetings from Wedding Tales Nepal 💍✨

To help us plan and coordinate your event smoothly, we kindly request you to fill in the contact details using the form link below.

The information will be used only for wedding coordination purposes (communication, location access, and scheduling) and will be kept strictly confidential.

👉 Please fill the form at your convenience:
https://wtnclienttracker.lovable.app/client-form/{clientId}

If you have any questions or face any difficulty while filling the form, feel free to contact us anytime.

Thank you for choosing Wedding Tales Nepal — we're excited to be a part of your special journey ❤️

Warm regards,
Wedding Tales Nepal
📞 Contact: 9705255025 / 9749494560 / 9847335279
```

**Button Layout in Header:**
```text
+---------------------------------------------------+
| [Users] CLIENT DETAILS  [✓ Form Sent]  [Filled]   |
|                                                   |
| [Copy Link] [Send to WhatsApp]                    |
+---------------------------------------------------+
```

---

## Part 5: "Form Sent" Status Badge

### File: `src/components/client-detail/ClientDetailsCard.tsx`

In the header section, conditionally show a "Form sent" badge:
- **If `formSentDate` has a value:** Show green badge "📤 Form sent" with relative time
- **If `formSentDate` is empty:** Show nothing (no badge)

**Visual:**
```text
When sent:    [📤 Form sent 2h ago]
When not:     (nothing displayed)
```

---

## Part 6: Backend Updates

### File: `supabase/functions/google-sheets/index.ts`

**1. Update `getClientContactDetails`:**
- Read Column AB (index 27) for formSentDate
- Return in response

**2. Update `updateClientContactDetails`:**
- Accept formSentDate in updates
- Write to Column AB

**3. New action: `submitClientContactForm`:**
- Public endpoint for form submission
- Takes clientId (registeredDateTimeAD) and form data
- Updates only columns D-AA (bride/groom details)
- Does NOT update formSentDate (that's only set when sending WhatsApp)

---

## Part 7: Hook Updates

### File: `src/hooks/useClientContactDetails.ts`

Add new function:
```typescript
const markFormAsSent = async (): Promise<boolean> => {
  // Updates formSentDate to current ISO timestamp
  return await updateContactDetails({ 
    formSentDate: new Date().toISOString() 
  });
};
```

Return `markFormAsSent` from the hook.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/ClientContactForm.tsx` | **Create** | Public form page with generic greeting |
| `src/App.tsx` | Modify | Add public route `/client-form/:clientId` |
| `src/lib/client-contact-api.ts` | Modify | Add `formSentDate` field |
| `src/hooks/useClientContactDetails.ts` | Modify | Add `markFormAsSent` function |
| `src/components/client-detail/ClientDetailsCard.tsx` | Modify | Add Copy Link, Send WhatsApp, Form Sent badge |
| `supabase/functions/google-sheets/index.ts` | Modify | Handle Column AB, add public form submission |

---

## Column Mapping Update

| Column | Index | Field |
|--------|-------|-------|
| A | 0 | registeredDateTimeAD |
| B | 1 | registeredDateBS |
| C | 2 | clientName |
| D-O | 3-14 | Bride details (12 fields) |
| P-AA | 15-26 | Groom details (12 fields) |
| **AB** | **27** | **formSentDate** (NEW) |

---

## Key Design Decisions

1. **Anonymity**: Client never sees their name or Google Sheets connection
2. **Generic Greeting**: "Dear Sir/Ma'am" instead of personalized name
3. **Client ID in URL**: Uses `registeredDateTimeAD` as unique identifier (non-guessable)
4. **Form Sent Tracking**: Only logged when WhatsApp button is clicked
5. **Thank You Message**: Includes wedding wishes after form submission
6. **Disclaimer**: Clear warning that anyone with the link can fill the form

---

## Implementation Order

1. Update schema (`client-contact-api.ts`) to add `formSentDate`
2. Update backend (`google-sheets/index.ts`) to handle Column AB
3. Create public form page (`ClientContactForm.tsx`)
4. Add route in `App.tsx`
5. Update hook with `markFormAsSent` function
6. Add buttons and badge to `ClientDetailsCard.tsx`
7. Deploy edge function and test end-to-end

