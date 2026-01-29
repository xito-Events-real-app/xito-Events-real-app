
# Fix WhatsApp Display and Link Issues in Client Details

## Problems Identified

**Issue 1: WhatsApp Number Not Visible**
The collapsed view summary only shows "WhatsApp" text with an icon, but does not display the actual phone number. Users want to see the number itself.

**Issue 2: WhatsApp Link Not Opening**
When clicking the WhatsApp button/link, nothing happens. This is because:
- If the phone number is empty, `formatWhatsAppLink()` returns an empty string
- An empty `href=""` makes the link navigate to the current page instead of WhatsApp
- The link should either show the number and work, or not render at all

---

## Solution

Update the collapsed view in `ClientDetailsCard.tsx` to:
1. Display the actual WhatsApp number alongside the icon (not just "WhatsApp")
2. Ensure the link correctly opens WhatsApp chat

---

## Changes Required

### File: `src/components/client-detail/ClientDetailsCard.tsx`

**Change 1: Bride WhatsApp Display (around line 443-447)**

Before:
```jsx
{data?.brideWhatsappNumber && (
  <a href={formatWhatsAppLink(data.brideWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="...">
    <MessageCircle className="h-3 w-3" />
    WhatsApp
  </a>
)}
```

After:
```jsx
{data?.brideWhatsappNumber && (
  <a href={formatWhatsAppLink(data.brideWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="...">
    <MessageCircle className="h-3 w-3" />
    {data.brideWhatsappNumber}
  </a>
)}
```

**Change 2: Groom WhatsApp Display (around line 485-489)**

Before:
```jsx
{data?.groomWhatsappNumber && (
  <a href={formatWhatsAppLink(data.groomWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="...">
    <MessageCircle className="h-3 w-3" />
    WhatsApp
  </a>
)}
```

After:
```jsx
{data?.groomWhatsappNumber && (
  <a href={formatWhatsAppLink(data.groomWhatsappNumber)} target="_blank" rel="noopener noreferrer" className="...">
    <MessageCircle className="h-3 w-3" />
    {data.groomWhatsappNumber}
  </a>
)}
```

---

## Expected Result

After these changes:
- The collapsed Client Details card will show the actual WhatsApp numbers (e.g., "+977 9841234567")
- Clicking the number will open WhatsApp chat with that contact
- The green WhatsApp icon will still appear next to the number
- The link will only render if a number exists (current behavior preserved)

---

## Technical Details

| Location | Change |
|----------|--------|
| `ClientDetailsCard.tsx` line ~446 | Replace "WhatsApp" with `{data.brideWhatsappNumber}` |
| `ClientDetailsCard.tsx` line ~488 | Replace "WhatsApp" with `{data.groomWhatsappNumber}` |

The `formatWhatsAppLink()` function already correctly formats the URL - no changes needed there.
