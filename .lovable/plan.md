

# Change "Not Required" Cells from Black to White

## What Changes

Currently, "Not Required" freelancer cells use a dark/black background (`bg-gray-900 text-gray-500`). This will be changed to a **white background** with subtle styling so the cells are clearly distinct but light instead of dark.

## Technical Changes

### File: `src/components/suite/AllClientsCrewTable.tsx`

Two locations need updating:

1. **Line 541** (expanded card view) -- Change `bg-gray-900` to `bg-white border border-gray-200 text-gray-400`
2. **Line 833** (compact table cell) -- Change `bg-gray-900 text-gray-500` to `bg-white border border-gray-200 text-gray-400`

Both spots will switch from dark black boxes to clean white boxes with a light border, making "Not Required" slots appear as empty/white cells with a subtle dash or strikethrough text.

