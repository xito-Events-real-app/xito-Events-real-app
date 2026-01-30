
# Plan: Add Contact Info & Comments to Upcoming Events Cards

## Problem Summary

The user wants to enhance the upcoming events cards on the Xito Business Suite homepage (TodayEventsHero component) with:
1. **Phone number** with call icon (clickable)
2. **WhatsApp number** with WhatsApp icon (clickable)  
3. **Plus button** to add new comments
4. **Most recent comment** displayed on the card

---

## Current State Analysis

The `TodayEventsHero.tsx` component currently shows:
- Client name
- Event name (RECEPTION, WEDDING, etc.)
- Days until event badge (TODAY, Tomorrow, X days)
- Venue information (name, area, timing)
- Parlour information (name, area, timing)

**What's available in the data:**
- `client.contactNo` - Phone number (Column G)
- `client.whatsappNo` - WhatsApp number (Column H)
- `client.comments` - Comments with timestamps (Column AC)
- `client.bookedRowNumber` - Row number for API updates

**Comment format:** `"Comment text [MM/DD/YYYY HH:MM]|||Another comment [MM/DD/YYYY HH:MM]"`

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Event Card - Enhanced Layout                                    │
├─────────────────────────────────────────────────────────────────┤
│  [TODAY]  Client Name                    📞 9841...  💬 9851... │
│           RECEPTION                                          → │
├─────────────────────────────────────────────────────────────────┤
│  📍 PALIFAL RESTAURANT, KRITIPUR • 10:00 AM - 7:00 PM           │
│  ✂️ Parlour not set                                             │
├─────────────────────────────────────────────────────────────────┤
│  💬 "Last comment text here..."              [+]    2 hours ago │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Phone & WhatsApp Icons to Header Row

**Location:** Right side of client name row

**Changes:**
- Add Phone icon with truncated number (last 4 digits visible)
- Add WhatsApp icon with truncated number
- Both icons are clickable (tel: and wa.me links)
- Use `stopPropagation()` to prevent card navigation when clicking icons

```tsx
{/* Contact icons - right side */}
<div className="flex items-center gap-1.5 shrink-0">
  {client.contactNo && (
    <a 
      href={`tel:${client.contactNo}`}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition-colors"
    >
      <Phone className="w-3 h-3" />
      <span className="hidden sm:inline">...{client.contactNo.slice(-4)}</span>
    </a>
  )}
  {client.whatsappNo && (
    <a 
      href={`https://wa.me/${client.whatsappNo.replace(/\D/g, '')}`}
      target="_blank"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-600 text-xs transition-colors"
    >
      <MessageCircle className="w-3 h-3" />
      <span className="hidden sm:inline">...{client.whatsappNo.slice(-4)}</span>
    </a>
  )}
</div>
```

### Step 2: Add Comment Section

**Location:** Below venue/parlour details

**Features:**
- Show most recent comment text (truncated to 50 chars)
- Show relative time ("2 hours ago")
- Plus button to open comment drawer
- Use existing `parseComments` and `getRelativeTime` utilities

```tsx
{/* Recent Comment */}
{parsedComments.length > 0 && (
  <div className="flex items-center gap-2 text-xs mt-1.5 pt-1.5 border-t border-gray-100">
    <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    <span className="text-gray-600 truncate flex-1">
      "{parsedComments[parsedComments.length - 1].text}"
    </span>
    {parsedComments[parsedComments.length - 1].timestamp && (
      <span className="text-gray-400 shrink-0">
        {getRelativeTime(parsedComments[parsedComments.length - 1].timestamp)}
      </span>
    )}
  </div>
)}
```

### Step 3: Add Comment Drawer (Plus Button)

**Approach:** 
- Add a small floating plus button on each card
- When clicked, open a Drawer with input field
- Use existing `addClientComment` API function
- Refresh data after comment is added

**New State Required:**
```tsx
const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
const [selectedEventForComment, setSelectedEventForComment] = useState<{
  clientName: string;
  rowNumber: number;
  existingComments: string;
} | null>(null);
const [newComment, setNewComment] = useState('');
const [isAddingComment, setIsAddingComment] = useState(false);
```

**Comment Handler:**
```tsx
const handleAddComment = async () => {
  if (!selectedEventForComment || !newComment.trim()) return;
  
  setIsAddingComment(true);
  try {
    await addClientComment(
      selectedEventForComment.rowNumber,
      newComment.trim(),
      selectedEventForComment.existingComments
    );
    setNewComment('');
    setCommentDrawerOpen(false);
    // Trigger refresh of booked clients data
    // (useBookedCachedData will handle cache invalidation)
  } catch (error) {
    console.error('Failed to add comment:', error);
  } finally {
    setIsAddingComment(false);
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/suite/TodayEventsHero.tsx` | Add phone/WhatsApp icons, comment display, comment drawer |

---

## New Imports Required

```tsx
import { Phone, MessageCircle, MessageSquare, Plus, Loader2 } from "lucide-react";
import { parseComments, getRelativeTime } from "@/lib/client-card-utils";
import { addClientComment } from "@/lib/sheets-api";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
```

---

## UI/UX Considerations

1. **Mobile-first:** Phone numbers are truncated on mobile, shown fuller on desktop
2. **Non-blocking clicks:** Phone/WhatsApp/Comment buttons use `stopPropagation()` to prevent card navigation
3. **Visual hierarchy:** Contact icons are subtle (pill badges), comment is at bottom
4. **Feedback:** Loading spinner on plus button while adding comment
5. **Cache refresh:** After adding comment, the booked clients cache is invalidated to show updated data

---

## Edge Cases

- **No phone/WhatsApp:** Icons don't render if numbers are missing
- **No comments:** Comment section doesn't render if empty
- **Long comments:** Truncated with ellipsis (max 50 chars)
- **Missing row number:** Plus button disabled if row number is unavailable
