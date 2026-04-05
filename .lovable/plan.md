

# Add "Send to Client" Button in YouTube Dashboard Timing Section

## What We're Building
A "Send to Client" button at the end of the timing/metadata grid that opens a dialog showing all WhatsApp numbers associated with the client (bride, groom, main contact). Clicking a recipient auto-generates a context-aware WhatsApp message about the new video, including the client portal link.

## Message Logic
The message is dynamically generated based on the video title:
- Extracts **event name** (e.g., "BRIDE RECEPTION") and **edit type** (Full Video / Highlights / Reel / Teaser) from the video title (text before `||`)
- Includes the client portal link for all photos/videos
- Warns the client this is for review purposes

Example message:
> Hello 👋  
> Greetings from Wedding Tales Nepal 💍✨  
>  
> Your **Bride Reception Full Video** has been uploaded! 🎬  
> Please check and let us know if any changes are needed.  
>  
> 👉 View all your photos & videos here:  
> https://business.xitoevents.com/client-portal/...  
>  
> ⚠️ Please do not share this video publicly until finalized.  
>  
> Warm regards, Wedding Tales Nepal

## File to Modify
**`src/components/suite/YouTubeDashboard.tsx`** only

### Change 1: Add state for send dialog
- `const [sendToClientOpen, setSendToClientOpen] = useState(false)`

### Change 2: Add "Send to Client" button after the timing grid (after line ~1213)
- A small emerald button with MessageCircle icon: "Send to Client"
- Only visible when `trackerInfo` exists (we need `registered_date_time_ad` to look up contacts and generate portal link)

### Change 3: Fetch contact details when dialog opens
- Query `contact_details_cache` by `trackerInfo.registered_date_time_ad` to get bride/groom names and WhatsApp numbers
- Also use `clients_cache` for main contact/WhatsApp numbers
- Build recipients list: `[{label: "Bride Name (WhatsApp)", phone}, {label: "Groom Name (WhatsApp)", phone}, {label: "Client (Contact)", phone}]`

### Change 4: Generate context-aware message
- Parse the video title (before `||`) to extract event name and edit type keywords (Full Video, Highlights, Reel, Teaser)
- Build a WhatsApp message mentioning the specific video type and event
- Append the client portal URL using `getClientPortalUrl(registeredDateTimeAD, clientName)`

### Change 5: Render the send dialog
- Dialog with recipient list (same pattern as `ClientLinkSection`)
- Each recipient row shows name, phone, and a WhatsApp icon
- Clicking opens `wa.me` with the pre-filled message

## Data Flow
```text
trackerInfo.registered_date_time_ad
  → contact_details_cache (bride/groom names + WhatsApp numbers)
  → clients_cache (main contact + WhatsApp)
  → Build recipients list
  → Generate message from video title + portal URL
  → Open wa.me link
```

