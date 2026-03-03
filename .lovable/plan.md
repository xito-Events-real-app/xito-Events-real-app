

# Fix: Duplicate Clients in Finance Manager

## Root Cause

Both Realtime INSERT handlers in `useBookedCachedData.ts` (line 102-108) and `useCachedData.ts` (line 155-156) blindly append to the **memory cache singleton** without checking for duplicates:

```typescript
// useBookedCachedData.ts line 106 — NO dedup check!
const updated = [...mem, mapped];
setMemoryBookedClients(updated);

// useCachedData.ts line 156 — same problem!
if (mem) setMemoryClients([...mem, mapped]);
```

Meanwhile, the React `setClients` state updater on the lines above DOES check `prev.some(c => c.registeredDateTimeAD === ...)` — but the memory singleton skips this check.

**What happens:** Every time a Supabase Realtime INSERT event fires (e.g. during sync, or when the same row is re-inserted), the memory cache accumulates duplicates. When any `cache-updated` event fires later, it reads from memory and propagates those duplicates to the UI. This is why it's intermittent — it depends on how many realtime INSERT events fire during the session.

## Fix (2 files)

### 1. `src/hooks/useBookedCachedData.ts` — Add dedup guard to memory INSERT

Line 102-108: Before appending, check if `registeredDateTimeAD` already exists in memory:

```typescript
const mem = getMemoryBookedClients();
if (mem) {
  const updated = payload.eventType === 'UPDATE'
    ? mem.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c)
    : mem.some(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD)
      ? mem.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c)
      : [...mem, mapped];
  setMemoryBookedClients(updated);
}
```

### 2. `src/hooks/useCachedData.ts` — Same fix for clients memory INSERT

Line 155-156: Add the same dedup guard:

```typescript
const mem = getMemoryClients();
if (mem) {
  if (mem.some(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD)) {
    setMemoryClients(mem.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c));
  } else {
    setMemoryClients([...mem, mapped]);
  }
}
```

## Impact
- No risk of breaking any hook APIs or causing re-render loops (change is inside an event callback, not a render path).
- Fixes duplicates in Finance Manager, Booked Clients, Dashboard, and any other view reading from these memory singletons.

