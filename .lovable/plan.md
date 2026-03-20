

## Reconfirmation Flow Upgrade + WhatsApp PDF for Freelancer

### Overview
Upgrade the "Reconfirmation" column across all file tables so it:
1. Only shows "NOT CONFIRMED" when 1st backup is set (`final_generated_path` is not empty)
2. Clicking "NOT CONFIRMED" opens a confirmation dialog with option to send WhatsApp message + PDF to the freelancer
3. Once confirmed, the button becomes non-clickable "CONFIRMED" permanently
4. The WhatsApp message includes a PDF with "Wedding Tales Nepal" branding and file details

### Changes

#### 1. New Component: `ReconfirmationDialog` (`src/components/files/ReconfirmationDialog.tsx`)
A dialog that appears when clicking "NOT CONFIRMED":
- Shows file details summary (client name, nepali date, card, format, 1st backup device/path)
- Two buttons: **"Confirm & Send WhatsApp"** and **"Confirm Only (Skip)"**
- Both confirm the file (set `confirmed: true`, `reconfirmation: true`)
- "Send WhatsApp" generates a PDF, then opens WhatsApp with the freelancer's number
- Looks up freelancer WhatsApp number from `freelancers_cache` by matching `freelancer_name`

#### 2. PDF Generation (`src/lib/file-confirmation-pdf.ts`)
Uses browser-based PDF generation (jsPDF or html2canvas approach) to create a branded PDF:
- **Header**: "Wedding Tales Nepal" with branding
- **Body**: Client Name, Event Name, Nepali Date (BS), Event Date (AD), Freelancer Role, Card Label, Format Type, Size, 1st Backup Device, 1st Backup Path, Backup Time
- Returns a blob URL that can be downloaded

#### 3. Update Reconfirmation UI in 3 files:

**`src/components/files/FullScreenFilesTable.tsx`**:
- Hide reconfirmation column content when `!file.final_generated_path` (show "-")
- When `file.confirmed` → show non-clickable green "CONFIRMED"
- When not confirmed + has backup → show clickable red "NOT CONFIRMED" that opens `ReconfirmationDialog`

**`src/components/client-detail/ClientFilesSection.tsx`**:
- Same logic as above

**`src/components/files/FilesManagementTable.tsx`**:
- Replace simple checkbox with same button pattern

#### 4. WhatsApp Message
Compose a message like:
```
*Wedding Tales Nepal - File Backup Confirmation*

Hi {freelancerName}, your files have been copied successfully ✅

📋 *Details:*
• Client: {clientName}
• Event: {eventName}
• Date (BS): {nepaliDate}
• Card: {cardLabel}
• Format: {formatType}
• Size: {sizeGB} GB
• Backed up to: {deviceName}

📄 PDF receipt attached separately.

Thank you! 🙏
```
Uses `openWhatsApp()` from `src/lib/whatsapp-utils.ts`

### Files to create/modify
1. **Create** `src/components/files/ReconfirmationDialog.tsx` — dialog with confirm + WhatsApp option
2. **Create** `src/lib/file-confirmation-pdf.ts` — PDF generation utility
3. **Modify** `src/components/files/FullScreenFilesTable.tsx` — new reconfirmation UI
4. **Modify** `src/components/client-detail/ClientFilesSection.tsx` — new reconfirmation UI
5. **Modify** `src/components/files/FilesManagementTable.tsx` — replace checkbox with button pattern
6. **Install** `jspdf` package for PDF generation

