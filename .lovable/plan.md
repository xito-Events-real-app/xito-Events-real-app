

# Crew Schedule Welcome Popup -- Motion Poster with Today & Tomorrow Events

## Overview
When a freelancer opens their schedule link, a full-screen animated "motion poster" popup appears showing today's and tomorrow's events in a split-screen layout. It auto-dismisses after 12 hours using `localStorage`. Includes sound, countdown timers, crew list, venue/location info, and cinematic animations.

## Layout (Split Screen)

```text
+-------------------------------+
|        TODAY'S EVENT          |
|   (warm gradient - rose/amber)|
|                               |
|  Event: MEHNDI                |
|  Venue: Hotel Yak & Yeti     |
|  Area: Durbar Marg            |
|  Time: 10:00 AM - 2:00 PM    |
|  Countdown: Starts in 3h 20m |
|  Crew: PB: Ram, VG: Shyam    |
|                               |
+-------------------------------+
|      TOMORROW'S EVENT         |
|  (cool gradient - violet/blue)|
|                               |
|  Event: WEDDING               |
|  Venue: Soaltee Crowne        |
|  Area: Tahachal                |
|  Time: 8:00 AM - 6:00 PM     |
|  Countdown: Starts in 27h 20m|
|  Crew: PG: Hari, Drone: Sita |
|                               |
+-------------------------------+
|     [Got It - Dismiss]        |
+-------------------------------+
```

If only today has events, it takes the full screen. If only tomorrow, same. If neither, the popup doesn't show at all.

## Technical Plan

### 1. New Component: `src/components/crew-schedule/CrewWelcomePopup.tsx`

**Props:**
- `assignments: AssignmentRow[]` -- all assignments for this freelancer
- `eventDetailsCache: Map<string, { events: EventDetail[] }>` -- cached event details
- `freelancerName: string` -- to exclude from crew list
- `onDismiss: () => void`
- `onRequestDetails: (regKey: string) => void` -- to trigger lazy-load of event details

**Logic:**
- Check `localStorage` for key `crew-welcome-{freelancerName}` with a timestamp. If less than 12 hours ago, don't show.
- Filter assignments for today (BS date) and tomorrow (BS date + 1 day).
- On mount, call `onRequestDetails` for each today/tomorrow assignment to trigger event details loading.
- Show a live countdown timer (updates every second) showing "Starts in Xh Ym" based on `eventStartTime`.
- Crew list: Parse all role columns, exclude the current freelancer's name, show remaining crew with role badges.

**Animations (CSS in `src/index.css`):**
- `@keyframes crew-poster-slide-up` -- each half slides up with stagger
- `@keyframes crew-poster-glow` -- pulsing border glow on the event cards
- `@keyframes crew-countdown-tick` -- subtle scale pulse on the countdown text every second
- Entrance: full-screen fade-in with backdrop blur, cards slide up sequentially

**Sound:**
- Play the existing `/audio/meditation-music.mp3` at low volume (or a short chime portion) for 3-4 seconds on popup open.
- Use `new Audio()` with `.play()` on mount, auto-pause on dismiss.

### 2. CSS Additions in `src/index.css`

```css
@keyframes crew-poster-slide-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes crew-countdown-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### 3. Integration in `src/pages/CrewSchedule.tsx`

- Add state `showWelcome` (boolean).
- After assignments load, check localStorage and set `showWelcome = true` if eligible.
- Render `<CrewWelcomePopup>` when `showWelcome` is true, passing assignments and cache data.
- On dismiss: set localStorage timestamp, set `showWelcome = false`.

### 4. Data Details Shown Per Event Card

| Field | Source | Fallback |
|-------|--------|----------|
| Event Name | `assignment.event` | -- |
| Venue Name | `eventDetail.venueName` | "Loading..." |
| Area | `eventDetail.venueArea` | -- |
| Timing | `eventDetail.eventStartTime - eventEndTime` | "Not set" |
| Countdown | Calculated from start time vs now | "Today" / "Tomorrow" |
| Crew (excluding self) | All role columns parsed, self removed | -- |

### 5. Edge Cases
- No events today or tomorrow: popup doesn't appear at all
- Event details not yet loaded: show skeleton/shimmer for venue/time, auto-refresh when cache updates
- Multiple events on same day: show first event prominently, mention "+X more" badge
- Sound autoplay blocked by browser: wrapped in try/catch, fails silently

