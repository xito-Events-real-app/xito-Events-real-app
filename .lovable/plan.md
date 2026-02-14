

# Fix WhatsApp Send & Fallback to Contact Number

## Problems
1. The "Send Schedule to WhatsApp" button opens `wa.me` directly but gets blocked in the preview iframe. The existing `openWhatsApp` utility already handles this with a fallback mechanism.
2. The button currently opens WhatsApp without a recipient number (just `wa.me/?text=...`), so it doesn't send to anyone specific.
3. If the freelancer has no WhatsApp number, there's no fallback to their contact number.

## Solution

### 1. Pass freelancers list to FreelancerHoverInfo
- Add `freelancers: FreelancerData[]` to the `FreelancerHoverInfo` props
- Pass the `freelancers` prop from both desktop `CrewCell` and mobile render locations

### 2. Look up the freelancer's phone number
Inside `handleSendToWhatsApp`:
- Find the matching freelancer from the list by name (case-insensitive)
- Use `whatsappNo` if available, otherwise fall back to `contactNo`
- If neither exists, show a toast error "No phone number found for {name}"

### 3. Use the existing openWhatsApp utility
- Replace the manual `window.open` / anchor fallback with the centralized `openWhatsApp(phoneNumber, message)` function from `src/lib/whatsapp-utils.ts`
- This handles iframe blocking gracefully

## Files to Modify

### `src/components/suite/AllClientsCrewTable.tsx`
- Update `FreelancerHoverInfo` signature to accept `freelancers: FreelancerData[]`
- Update `handleSendToWhatsApp` to:
  - Look up the freelancer by name in the `freelancers` array
  - Use `whatsappNo || contactNo` as the phone number
  - Call `openWhatsApp(phone, message)` instead of manual `window.open`
  - Show toast if no number found
- Pass `freelancers` prop from all call sites of `FreelancerHoverInfo`

## Technical Details

```text
handleSendToWhatsApp flow:
  1. Find freelancer in list by name match
  2. phone = freelancer.whatsappNo || freelancer.contactNo
  3. If no phone --> toast error, return
  4. Build message with schedule URL
  5. Call openWhatsApp(phone, message)
```

Changes are confined to a single file with minimal modifications -- adding one prop and updating the handler logic.
