## COMPLETED: Filter non-BOOKED clients from booked views

Clients whose status changed from BOOKED (e.g. POSTPONED, CANCELLED) are now filtered out at query level across all modules. No data is deleted — `sheet_source` stays `'booked'` so reversing is automatic.
