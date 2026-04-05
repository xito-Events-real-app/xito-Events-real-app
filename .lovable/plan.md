

# Add "COLORED" and "NOT COLORED" Subfolders in Project Managers Events

## What Changes

Inside `buildResearchFolderTree()` in `src/lib/xito-drive-utils.ts`, after each event folder is created under "Project Managers", add two child folders: `COLORED` and `NOT COLORED`.

**Current structure:**
```text
Client / Project Managers / WEDDING BOTH SIDES
```

**New structure:**
```text
Client / Project Managers / WEDDING BOTH SIDES / COLORED
Client / Project Managers / WEDDING BOTH SIDES / NOT COLORED
```

## File to Modify

**`src/lib/xito-drive-utils.ts`** — lines 310-312

Replace:
```typescript
for (const ev of client.events) {
  paths.push(`${pmPath}/${ev.replace(/[/\\]/g, "_")}`);
}
```

With:
```typescript
for (const ev of client.events) {
  const evPath = `${pmPath}/${ev.replace(/[/\\]/g, "_")}`;
  paths.push(evPath);
  paths.push(`${evPath}/COLORED`);
  paths.push(`${evPath}/NOT COLORED`);
}
```

This also ensures these folders appear as virtual folders in the ResearchBrowser UI and get created during Smart Sync.

