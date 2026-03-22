

## Fix: Client Pages Not Opening (404 Error)

### Root Cause
Two files navigate to `/client/...` instead of the correct `/client-tracker/client/...` route, causing a 404.

### Changes

**1. `src/components/suite/AllClientsCrewTable.tsx` (line 762)**
- Change: `navigate(\`/client/${row.registeredDateTimeAD}\`)`
- To: `navigate(\`/client-tracker/client/${encodeURIComponent(row.registeredDateTimeAD)}\`)`

**2. `src/components/suite/AssignNoteDialog.tsx` (line 101)**
- Change: `navigate(\`/client/${encodeURIComponent(client.registeredDateTimeAD!)}\`)`
- To: `navigate(\`/client-tracker/client/${encodeURIComponent(client.registeredDateTimeAD!)}\`)`

Two lines changed, nothing else touched.

