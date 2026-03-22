## COMPLETED: Critical Fix — Name-Based Event Matching

### Problem
`ensureFreelancerAssignmentRows` used positional (index) matching — adding/reordering events rotated crew and file data across events.

### Fix applied
1. **Code**: Rewrote `ensureFreelancerAssignmentRows` to use **name-based matching** — finds existing rows by `event` name, only updates date fields, never touches crew.
2. **Data recovery (Shakti Neupane)**:
   - Restored file `event_name` from `final_generated_path` (BRIDE MEHNDI: 9 files/628GB, WEDDING: 13 files/807GB, PRE+RECEPTION: 13 files/611GB)
   - Cleared POST-SHOOT crew (new event, no crew yet)
   - Removed 10 duplicate file rows and empty skeletons
3. **Cascade delete** on event removal (files, video edit, freelancer settings)
