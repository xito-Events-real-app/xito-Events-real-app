

# Quick Add Freelancer: Always Ask All Skill Columns

## What Changes

Instead of only showing skill checkboxes for the "Assistant" role, the Quick Add Freelancer dialog will **always** show checkboxes for all professional skills regardless of which role column triggered it. The role that triggered the dialog will be **pre-checked** automatically.

## How It Works

### Dialog Layout

```
Name: [_______________] *
Contact: [_______________] *

What can this freelancer do? (check all that apply)
[x] Photographer    [ ] Videographer
[ ] Photo Editor    [ ] Video Editor
[ ] Drone Operator  [ ] FPV Operator
[ ] iPhone Shooter
```

- The checkbox matching the triggering role is **pre-checked and visually highlighted**
- User can check additional skills before saving

### Pre-check Rules

| Triggered From | Pre-checked Skill |
|---|---|
| Photographer Bride/Groom/Extra | Photographer |
| Videographer Bride/Groom/Extra | Videographer |
| Assistant | None (user picks) |
| iPhone Shooter | iPhone Shooter |
| Drone Operator | Drone Operator |
| FPV Operator | FPV Operator |

### Hybrid Auto-Computation (unchanged logic)

- **Hybrid Shooter** = YES only if BOTH Photographer AND Videographer are checked
- **Hybrid Editor** = YES only if BOTH Photo Editor AND Video Editor are checked
- These are computed automatically, not shown as checkboxes

### Main Job Derivation

Set from the first checked skill using priority order:
1. Photographer
2. Videographer
3. Photo Editor
4. Video Editor
5. Drone Operator
6. FPV Operator
7. iPhone Shooter

### Validation

At least one skill must be checked before saving.

## Files to Change

| File | Change |
|---|---|
| `src/components/suite/QuickAddFreelancerDialog.tsx` | Add skills checkboxes (always visible), pre-check based on triggering role, pass skills to API |
| `src/lib/freelancer-assignment-api.ts` | Update `quickAddFreelancer` to accept skills map, compute hybrid flags, derive mainJob from checked skills |

## Technical Details

### QuickAddFreelancerDialog.tsx

- Add `skills` state initialized with the triggering role pre-checked using `ROLE_TO_SKILL_MAP`
- Render a 2-column grid of `Checkbox` + `Label` pairs for all 7 skills
- On save, pass skills to `quickAddFreelancer(name, contact, roleField, skills)`
- Reset skills on close/success

### freelancer-assignment-api.ts

- Update `quickAddFreelancer` to always use skills map instead of hardcoded role assignments
- Compute hybrid flags:
  ```
  hybridShooter = photographer && videographer ? 'YES' : ''
  hybridEditor = photoEditor && videoEditor ? 'YES' : ''
  ```
- Derive mainJob from priority list based on first checked skill
- Pass all flags to `addFreelancer()`

