

# Google Forms Integration Plan

## Overview

You want clients to fill in contact details via a **Google Form** (google.com link) instead of your app. This ensures:
- Clients never access your app domain
- No name in the URL (just Google's form ID)
- No staff login needed since you're only sharing the form

---

## How Google Forms Works

Google Forms is a separate Google product that:
1. Has its own shareable URL (e.g., `https://docs.google.com/forms/d/e/FORM_ID/viewform`)
2. Collects responses and stores them in a linked Google Sheet
3. Is completely independent from your Lovable app

**Important:** I cannot create the Google Form for you directly because it needs to be created in YOUR Google account with access to YOUR spreadsheet. However, I can guide you through the exact steps.

---

## Step-by-Step: Create a Google Form

### Step 1: Create the Form

1. Go to [Google Forms](https://forms.google.com)
2. Click **+ Blank** to create a new form
3. Name it: "Wedding Tales Nepal - Contact Details"

### Step 2: Add Form Fields

Add these questions (matching your Contact Details sheet columns D-AA):

**Section 1: Bride's Details**
- Full Name (Short answer)
- Contact Number (Short answer)
- WhatsApp Number (Short answer)
- Backup Number 1 (Short answer)
- Backup 1 Relation (Dropdown: Mother, Father, Sister, Other)
- Backup Number 2 (Short answer)
- Backup 2 Relation (Dropdown: Mother, Father, Sister, Other)
- Instagram Handle (Short answer, without @)
- Home City (Short answer or Dropdown)
- Home Area (Short answer)
- Google Maps Link (Short answer)
- Landmark (Short answer)

**Section 2: Groom's Details**
- Same 12 fields as above

**Hidden/Identifier Field (Important!):**
- Add a hidden field or a field that identifies which client this form belongs to
- Option A: Pre-fill a "Client ID" field when generating the link
- Option B: Add a "Booking Reference" field where clients enter a code you give them

### Step 3: Link Responses to Your Sheet

1. In the form, click **Responses** tab
2. Click the Google Sheets icon (📊)
3. Choose **"Select existing spreadsheet"**
4. Select your **"BOOKED CLIENTS CONTACT DETAILS"** sheet OR create a new response sheet

---

## Option A: Separate Response Sheet (Recommended)

Google Forms creates its own response sheet. You can then:
- Manually copy responses to your Contact Details sheet
- OR use Google Apps Script to auto-sync responses

### Google Apps Script for Auto-Sync

Add this script to your spreadsheet (Extensions > Apps Script):

```javascript
function onFormSubmit(e) {
  // Get the form response
  var response = e.values;
  var clientId = response[1]; // Assuming Client ID is question 1
  
  // Find the matching row in BOOKED CLIENTS CONTACT DETAILS
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('BOOKED CLIENTS CONTACT DETAILS');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === clientId) { // Column A = registeredDateTimeAD
      // Update columns D-AA with form response data
      // Bride details: D-O (columns 4-15, indices 3-14)
      sheet.getRange(i + 1, 4, 1, 12).setValues([[
        response[2],  // Bride Full Name
        response[3],  // Bride Contact
        // ... map all fields
      ]]);
      break;
    }
  }
}
```

---

## Option B: Pre-filled Form Links

You can generate **unique pre-filled links** for each client that auto-populate a Client ID field:

1. In your form, add a field "Client Reference" (can be hidden later)
2. Get the form's edit link: `https://docs.google.com/forms/d/FORM_ID/edit`
3. Generate pre-filled URL: `https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.XXXXXX=CLIENT_ID`

I can update your app to generate these pre-filled form URLs.

---

## Changes to Your App

### Remove the In-App Form Page

Since clients will use Google Forms, we can:
1. **Remove** the public route `/client-form/:clientId`
2. **Remove** the `ClientContactForm.tsx` page
3. **Update** the "Send to WhatsApp" button to use the Google Form URL instead

### Update WhatsApp Message

Change the link in the WhatsApp message from:
```
https://wtnclienttracker.lovable.app/client-form/...
```
to:
```
https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?usp=pp_url&entry.XXXXXX=CLIENT_ID
```

---

## What You Need to Do

1. **Create the Google Form** in your Google account
2. **Share the Form ID** with me (the long string in the URL)
3. **Share the Entry ID** for the Client Reference field (found in the pre-fill URL)

Then I can update your app to:
- Generate pre-filled Google Form links for each client
- Update the WhatsApp message with the Google Form link
- Keep the "Form sent" tracking in your app

---

## Files to Modify (After You Provide Form Details)

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/client-contact-api.ts` | Modify | Update `getClientFormUrl()` to generate Google Form URL |
| `src/pages/ClientContactForm.tsx` | Delete | Remove the in-app form page |
| `src/App.tsx` | Modify | Remove the `/client-form/:clientId` route |

---

## Next Steps

1. **You create the Google Form** following the steps above
2. **Link it to a response sheet** (new or existing)
3. **Share with me:**
   - The Form ID (from the URL)
   - The Entry ID for the Client Reference field
4. **I update your app** to use the Google Form URL

Would you like me to proceed once you have the form set up?

