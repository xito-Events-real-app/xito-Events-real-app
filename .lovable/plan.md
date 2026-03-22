

## Cascade Event Removal to Files, Video Edit, and Freelancer Settings

### What this does
When an event is removed from a client in All Clients, cascade soft-deletes to `files_management`, `video_edit_tracker`, and hard-delete `freelancer_event_settings` — so orphaned rows don't linger.

### Data safety guarantee
- Only rows matching the **exact** `registered_date_time_ad` + removed `event_name` are affected
- `files_management` and `video_edit_tracker` use **soft-delete** (reversible)
- For Shyam Poudel's "NUWAKOT BHOJ SHOOT": 3 skeleton rows with 0 data — safe to remove

### Code change — `src/lib/freelancer-assignment-cache.ts` (lines 261-267)

After the existing `freelancer_assignments` delete, add cascade to three tables:

```typescript
if (existingList.length > names.length) {
  const toDelete = existingList.slice(names.length);
  const ids = toDelete.map(r => r.id);
  await supabase.from('freelancer_assignments').delete().in('id', ids);

  // CASCADE: soft-delete files, video edit; hard-delete settings
  for (const removedRow of toDelete) {
    await supabase.from('files_management')
      .update({ deleted_or_not: true, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('event_name', removedRow.event);

    await supabase.from('video_edit_tracker')
      .update({ deleted: true, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('event_name', removedRow.event);

    await supabase.from('freelancer_event_settings')
      .delete()
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('event_name', removedRow.event);
  }

  console.log(`[CREW SYNC] Deleted ${toDelete.length} removed event rows + cascaded for ${clientName}`);
}
```

### Data fix for Shyam Poudel
Soft-delete the 3 orphaned "NUWAKOT BHOJ SHOOT" file rows via database update.

### Files changed
1. `src/lib/freelancer-assignment-cache.ts` — add cascade in event removal block
2. Data: soft-delete 3 orphaned rows for Shyam Poudel

