

## Master Sync Button for Xito Business Suite

Add a powerful "Master Sync" button to the suite landing page that performs a complete 3-phase synchronization across all data sources with an immersive rocket launch animation and epic motivational music.

---

### Sync Phases

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                          MASTER SYNC FLOW                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHASE 1: CLIENT TRACKER                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  • Fetch all clients from CLIENT TRACKER sheet                   │   │
│  │  • Fetch dropdowns data                                          │   │
│  │  • Update local IndexedDB cache                                  │   │
│  │  → Progress: 0% - 33%                                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                             ↓                                            │
│  PHASE 2: BOOKED CLIENTS                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  • Call fullResyncAllBookedClients(true)                         │   │
│  │  • Syncs CLIENT TRACKER → BOOKED CLIENTS                         │   │
│  │  • Copies missing BOOKED status clients                          │   │
│  │  → Progress: 34% - 66%                                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                             ↓                                            │
│  PHASE 3: EVENT DETAILS                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  • Call fullSyncEventDetails()                                   │   │
│  │  • Syncs BOOKED CLIENTS → EVENT DETAILS sheet                    │   │
│  │  • Updates client/event info, preserves logistics data           │   │
│  │  → Progress: 67% - 100%                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Animation Sequence

**Full-Screen Overlay with Rocket Launch Theme:**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│     ★  ★           ★              ★            ★            ★          │
│           ★                 ★                        ★                  │
│                    ★                    ★                  ★            │
│     ★                                                                   │
│                          🚀                                             │
│                     ╭───────────╮                                       │
│                     │  ROCKET   │   ← Animated rocket with flames       │
│                     ╰─────┬─────╯                                       │
│                        ╲▽╱       ← Exhaust flames animation             │
│                       ╲▽▽▽╱                                             │
│                                                                         │
│   ═══════════════════════════════════════════════════════════════       │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│   ═══════════════════════════════════════════════════════════════       │
│                                                                         │
│           PHASE 2: SYNCING BOOKED CLIENTS                               │
│                      45% Complete                                       │
│                                                                         │
│                  ♫ Epic Music Playing ♫                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Animation Stages:**
1. **Countdown** (3-2-1) with pulsing numbers
2. **Liftoff** - Rocket shakes and starts rising
3. **Ascent** - Rocket moves up through starfield with flame particles
4. **Warp Speed** - At 100%, rocket accelerates into a light streak
5. **Success** - Screen flashes with "SYNC COMPLETE" celebration

---

### Music

**Epic Orchestral/Electronic Track:**
- Using free royalty-free track similar to "Inception: Time" vibe
- Options:
  - Mixkit cinematic trailer music
  - Free epic orchestral build-up track
- Music fades in on button press, builds during sync, crescendo at completion

---

### UI Placement

**Mobile Layout:**
```text
┌─────────────────────────────────────┐
│  Xito Business Suite           [X] │
│  Your complete business toolkit    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ Add Client  │ │ Add Payment │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  ╔═════════════════════════════╗   │  ← NEW: Master Sync Button
│  ║  🚀  MASTER SYNC            ║   │     (Full width, gradient, 
│  ║  Sync All Data Across Apps  ║   │      rocket icon)
│  ╚═════════════════════════════╝   │
│                                     │
│  [Today's Schedule Hero]           │
│  ...                               │
└─────────────────────────────────────┘
```

**Desktop Layout:**
- Same button, placed in Quick Actions section alongside Add Client/Add Payment

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/suite/MasterSyncButton.tsx` | **CREATE** | New component with sync logic, rocket animation overlay, and music |
| `src/components/suite/MobileSuiteLanding.tsx` | **MODIFY** | Add MasterSyncButton below quick add buttons |
| `src/components/suite/DesktopSuiteLanding.tsx` | **MODIFY** | Add MasterSyncButton in Quick Actions section |

---

### Technical Implementation

**1. MasterSyncButton Component Structure:**
```typescript
interface SyncPhase {
  id: 'tracker' | 'booked' | 'events';
  label: string;
  description: string;
}

const SYNC_PHASES: SyncPhase[] = [
  { id: 'tracker', label: 'Client Tracker', description: 'Fetching fresh client data...' },
  { id: 'booked', label: 'Booked Clients', description: 'Syncing to booked clients sheet...' },
  { id: 'events', label: 'Event Details', description: 'Updating event details...' },
];
```

**2. Sync Execution:**
```typescript
const handleMasterSync = async () => {
  setIsSyncing(true);
  setShowOverlay(true);
  playEpicMusic();
  
  try {
    // Phase 1: Client Tracker (0-33%)
    setCurrentPhase('tracker');
    await syncClientTracker();
    setProgress(33);
    
    // Phase 2: Booked Clients (34-66%)
    setCurrentPhase('booked');
    await fullResyncAllBookedClients(true);
    setProgress(66);
    
    // Phase 3: Event Details (67-100%)
    setCurrentPhase('events');
    await fullSyncEventDetails();
    setProgress(100);
    
    // Success celebration
    await playSuccessAnimation();
  } finally {
    stopMusic();
    setIsSyncing(false);
    setShowOverlay(false);
  }
};
```

**3. Rocket Animation CSS:**
- Starfield background with animated stars
- Rocket SVG with exhaust flame particles
- Progress bar with glowing effect
- Phase labels with typewriter effect
- Warp speed lines on completion

**4. Audio:**
- Epic orchestral track for sync duration
- Success chime at completion
- Volume fades in/out smoothly

---

### Visual Details

**Button Design:**
- Gradient: `from-orange-500 via-red-500 to-purple-600`
- Icon: Rocket icon (Lucide)
- Shadow: Warm glow effect
- Hover: Scale + increased glow
- Loading state: Disabled with spinner

**Overlay Colors:**
- Background: Deep space blue (#0a0a1a)
- Stars: White with varying opacity
- Rocket: Orange/red gradient
- Flames: Animated orange/yellow/red
- Progress bar: Cyan gradient
- Text: White with glow effect

**Completion Animation:**
- Screen flash (white)
- Confetti burst
- "SYNC COMPLETE" with scale animation
- Stats summary (clients synced, events updated)

