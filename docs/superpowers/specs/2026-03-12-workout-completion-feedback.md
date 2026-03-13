# Workout Completion Visual Feedback

**Tag:** `UX-001` — Completed Workout Collapse
**Status:** Backlog
**Priority:** UX polish

## Problem

After a user completes a workout (taps "Complete Workout", goes through the exercise rating flow in PostWorkoutModal), the workout tile remains fully expanded with no visual indication that it's been completed. The user has no at-a-glance way to see which workouts are done.

## Desired Behavior

1. After completing the rating flow and the `POST /api/workout/complete` mutation succeeds:
   - The workout tile **collapses** (hides exercise details)
   - The tile shows a **visual completion indicator** — e.g., a green checkmark overlay, a "Completed" badge, or a muted/dimmed card style
   - The "Complete Workout" button is replaced or hidden

2. On page reload, completed workouts should **stay collapsed** with the completion indicator. This means the completion state must come from the API (the `workout_logs` table already tracks this).

3. The tile should still be expandable so the user can review what they did, but the default state for completed workouts is collapsed.

## Data Flow

- `GET /api/plan/current` response already includes workout data per day
- `GET /api/workout/complete` or a new endpoint could return which days have been logged
- Alternatively, the plan response could include a `completed: boolean` flag per day (requires server change)

## Components Affected

- `WorkoutsTab.tsx` — needs to track completion state per day tile
- `DayCard` (or equivalent accordion component) — needs collapsed + completed visual state
- `PostWorkoutModal.tsx` — on success, should trigger the parent to mark the day as completed
- Possibly `useCurrentPlan.ts` — may need to refetch or optimistically update after workout submission

## Design Notes

- Completion indicator should be visible even when collapsed (e.g., checkmark on the tile header)
- Should feel rewarding — subtle animation or color shift on completion
- Matches existing Crea brand (pink/purple gradient palette)
