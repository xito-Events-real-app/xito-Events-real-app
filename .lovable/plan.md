

## Enhanced Available Editors — Show Stage, Tasks & Actions

### What's Changing

Update the "Available Editors" section in `DashboardView` to show contextual info per editor based on their current stage:

- **EDIT_LAB editors**: Show "Edit Lab" badge + their assigned tasks (client, event, edit type) + WhatsApp button with pre-filled message
- **QUEUE editors**: Show "Queue" badge + their assigned tasks + "Move to Edit Lab" button
- **NO ROWS editors**: Show just the name + click to assign from unassigned queue (existing behavior)

### Files Changed

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`**

**Editor fetch** (line ~774): Also select `whatsapp_no` from `freelancers_cache`. Update editor state type to include `whatsapp?: string`.

**`availableEditors` computation** (line ~812): Change from `string[]` to objects:
```typescript
{ name: string; stage: 'EDIT_LAB' | 'QUEUE' | 'NONE'; rows: DisplayRow[]; whatsapp: string }
```
- Check if editor has rows in EDIT_LAB → stage = 'EDIT_LAB', collect those rows
- Else if editor has rows in QUEUE → stage = 'QUEUE', collect those rows  
- Else → stage = 'NONE', no rows

**`DashboardView` props**: Change `availableEditors` from `string[]` to the new object type. Add `onPushToStatus` prop for "Move to Edit Lab".

**Available Editors cards**: Render differently per stage:

- **EDIT_LAB**: Amber border, "Edit Lab" badge, list tasks (client · event · edit type), WhatsApp icon button using `openWhatsApp(whatsapp, "Hi [name], have you started editing [client] - [event] ([editType])?")`. Click card still opens assign dialog.
- **QUEUE**: Yellow border, "Queue" badge, list tasks, green "Move to Edit Lab" button that calls `onPushToStatus` for each of the editor's QUEUE rows.
- **NONE**: Current plain card style — just name, click to open assignment dialog.

**Import** `openWhatsApp` from `@/lib/whatsapp-utils`.

