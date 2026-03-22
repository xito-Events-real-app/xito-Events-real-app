

## Fix: Shakti Neupane — Correct Crew Assignments + File Cleanup

### Current vs Correct Crew

**BRIDE MEHNDI & GROOM HALDI** (currently wrong):
```text
Current:  PB=empty, PG=NIKIT, VB=empty, VG=BARUN, EP=ARJUN, IPHONE=BENZO
Correct:  PB=ARJUN, PG=PRASAN, VB=BARUN, VG=JEEWAN, DRONE=ARJUN
```

**WEDDING BOTH SIDES** (almost right, missing EV + wrong DRONE):
```text
Current:  PB=ARJUN, PG=PRASAN, VB=BARUN, VG=JEEWAN, DRONE=ARJUN
Correct:  PB=ARJUN, PG=PRASAN, VB=BARUN, VG=JEEWAN, DRONE=BARUN, EV=AASHIK
```

**PRE+RECEPTION** (EV wrong, missing EP):
```text
Current:  PB=ARJUN, PG=PRASAN, VB=BARUN, VG=JEEWAN, EV=Aashik, DRONE=BARUN
Correct:  PB=ARJUN, PG=PRASAN, VB=BARUN, VG=JEEWAN, EP=NIKIT, EV=HARI
```

### Data fixes (via database migration)

**1. Fix crew in `freelancer_assignments`:**

- **BRIDE MEHNDI** (id: `0e3f36b0`): set PB=ARJUN PANDEY, PG=PRASAN KARKI, VB=BARUN KOIRALA, VG=JEEWAN SHRESTHA, DRONE=ARJUN PANDEY, clear EP/IPHONE
- **WEDDING** (id: `a02a5567`): set DRONE=BARUN KOIRALA, EV=Aashik Magar
- **PRE+RECEPTION** (id: `6fcc83a9`): set EP=NIKIT NEUPANE, EV=Hari Khanal, clear DRONE

**2. Clean up wrong skeleton file rows (0GB, empty path):**
- BRIDE MEHNDI: delete skeletons for NIKIT/PG, BARUN/VG, ARJUN/EP, BENZO/IPHONE
- WEDDING: delete skeleton for ARJUN/DRONE (real BARUN/DRONE data exists)
- PRE+RECEPTION: delete skeletons for Aashik/EV, ARJUN/PB, BARUN/DRONE, PRASAN/PG

**3. Keep all file rows with real data (size > 0) untouched** — paths are physically correct on disk.

### Files changed
- Database only — no code changes needed

### Safety
- Only Shakti Neupane rows touched
- Only 0GB skeleton rows deleted; all rows with real file data preserved
- Crew fields set exactly as user specified

