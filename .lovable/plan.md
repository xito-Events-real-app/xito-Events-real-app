
# Phone Number Validation — Client Contact Form

## Problem
The three phone number fields in `src/pages/ClientContactForm.tsx` — **Contact Number**, **Backup Number 1**, and **Backup Number 2** — currently accept any input: letters, symbols, country codes (e.g. `+977`), and numbers longer than 10 digits. Nepali mobile numbers are exactly 10 digits, so anything else is invalid data.

## What Will Change

Only **one file** needs editing: `src/pages/ClientContactForm.tsx`

### 1. Add a phone number sanitiser helper (top of file)
A small helper function that:
- Strips all non-digit characters (removes `+`, spaces, `-`, country codes like `977`)
- Clamps input to a maximum of **10 digits**

```
function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}
```

### 2. Update `PersonForm` — three input fields

**Contact Number** (currently lines 482–489):
- Change `onChange` to pass through `sanitizePhone(e.target.value)` instead of the raw value
- Add `maxLength={10}` attribute
- Add `inputMode="numeric"` so mobile keyboards show the number pad
- Add `pattern="[0-9]{10}"` for native browser form validation
- Add a small helper text below: `"10-digit Nepali number (e.g. 98XXXXXXXX)"`

**Backup Number 1** (currently lines 507–513):
- Same changes as Contact Number

**Backup Number 2** (currently lines 536–542):
- Same changes as Contact Number

### 3. Add submit-time validation in `handleSubmit`

Before the API call (line 163), validate that all filled phone numbers are exactly 10 digits:

```
const phoneFields = [
  { value: bride.contactNumber, label: "Bride's Contact Number" },
  { value: bride.backupNumber1, label: "Bride's Backup Number 1" },
  { value: bride.backupNumber2, label: "Bride's Backup Number 2" },
  { value: groom.contactNumber, label: "Groom's Contact Number" },
  { value: groom.backupNumber1, label: "Groom's Backup Number 1" },
  { value: groom.backupNumber2, label: "Groom's Backup Number 2" },
];

for (const { value, label } of phoneFields) {
  if (value && value.length !== 10) {
    toast.error(`${label} must be exactly 10 digits`);
    setIsSubmitting(false);
    return;
  }
}
```

Note: `bride.contactNumber` is required by HTML `required` attribute, so it will always be filled. The backup numbers and groom contact are optional — we only validate length if they are non-empty.

## Behaviour Summary

| Scenario | Before | After |
|---|---|---|
| User types `+977-98XXXXXXXX` | Saved as-is | `+977` stripped → saved as `98XXXXXXXX` |
| User types `9841234567890` (13 digits) | Saved as-is | Clamped at 10 digits → `9841234567` |
| User types `984abc123` | Saved as-is | Letters stripped → `984123` (only 6 digits, fails submit validation) |
| User pastes `+1 415 555 0123` | Saved as-is | Non-digits stripped, clamped → `1415555012` |
| User types exactly `9841234567` | Saved correctly | Saved correctly ✅ |
| Mobile keyboard | Alphanumeric keyboard | Number pad via `inputMode="numeric"` ✅ |

## Files Changed
- `src/pages/ClientContactForm.tsx` — sanitiser helper + three input field updates + submit validation

No backend changes, no new dependencies, no schema changes needed.
