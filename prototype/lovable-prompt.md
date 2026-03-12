# Crea — Fitness App Prototype for Lovable

## What This Is
A personal AI fitness coach app with 3 tabs + 1 modal. The user checks in weekly, the AI generates workout plans, nutrition targets, and progress narratives. Built for a single user (female, PCOS, strength-focused).

## Design Direction
**Reference: TIDE app (iOS)**. The aesthetic is frosted glass panels layered over warm, soft backgrounds. Translucent — you see through everything. Nothing is opaque or heavy. Panels feel like sheets of glass stacking on each other. Light shines through. Effortless, airy, minimal.

Key visual principles:
- Glass/frosted translucent cards (backdrop-filter blur)
- Warm, light backgrounds (not dark, not stark white)
- Very soft borders — glass creates separation, not lines
- Generous border-radius (20-24px)
- Light font weights on larger text
- Muted, natural color palette — no saturated brand colors
- Tons of breathing room
- Bottom tab bar is also frosted glass
- Buttons are frosted glass pills, not heavy gradient blocks
- Typography: clean, light, elegant

The app has a diamond logo (SVG diamond shape). The diamond should feel subtle and integrated, not loud.

## Tab Structure

### Tab 1: Workouts
Shows 7 day cards (Mon-Sun), each collapsible. Today's card auto-expands. Each day card shows:
- Day name + subtitle (workout type)
- Type badge: Vigorous (warm/red tint), Strength (blue tint), Recovery (green tint), Rest (neutral)
- Colored left border indicating type
- Expand arrow

When expanded, shows:
- Caution/note boxes (if any)
- Vigorous interval details (if vigorous day)
- Warm-up exercises (name + sets)
- Main Work exercises (name + sets, with optional AI-suggested weight)
- Superset groups (exercises grouped in a slightly inset panel)
- Core circuit (exercises + sets)
- Finisher (cardio finisher description)
- Rest days show simple activity list

Today's card has a "Done" button that opens the post-workout modal.

### Tab 2: Lifestyle
Three cards:
1. **Nutrition** — 2x2 grid showing Protein (g), Calories, Water (oz), Focus. Plus a short note about carb timing.
2. **Sleep** — Timeline showing bedtime routine (7:30 PM last meal → 5:30 AM wake), with a target hours badge and a sleep note.
3. **Grocery List** — Coming soon placeholder.

### Tab 3: Profile (Progress)
Four cards:
1. **Your Story** — AI-generated progress narrative (placeholder text until first check-in)
2. **What You Can Do Now** — Strength gains list (exercise name + current weight + delta from start)
3. **Under the Surface** — Health metrics (Resting HR, HRV, Sleep avg, Stress avg) with trend arrows
4. **Your 12 Weeks** — Minimal bar chart showing 12 weeks, color-coded by mode (Ramp-Up=gold, Push=warm, Maintain=green, Upcoming=neutral), current week highlighted

### Modal: Sunday Check-In (full-screen, blocking)
3-step flow:
1. **Energy + Drive** — Two 1-5 tap scales (circular glass buttons), optional notes textarea
2. **Progress Photo** — Take photo or upload from camera roll, skip option
3. **Loading → Result** — Diamond pulses while AI works, then shows mode badge (Push Week / Maintain Week) + subtitle + two CTAs (See Workouts, See Lifestyle Plan)

### Modal: Post-Workout Rating (bottom sheet)
Shows each exercise from today's workout with rating buttons: Good, Too Light, Too Heavy, Skipped. Plus optional notes. Submit button.

## Data

### Week 1 Ramp-Up (default view)
```json
{
  "days": [
    {
      "day": "Thursday", "subtitle": "Upper Body", "type": "strength",
      "caution": "Avoid heavy overhead pressing. Keep breathing steady.",
      "warmup": ["Arm circles 30 sec each", "Band pull-aparts 15", "Light lat pulldowns 10"],
      "main": ["Lat pulldowns 3×12", "DB shoulder press (light) 3×10", "Seated cable rows 3×12", "Lateral raises 3×12", "Face pulls 3×15", "Rear delt flyes 3×12"],
      "superset": { "label": "Arms — 2 rounds", "exercises": ["Bicep curls 12", "Tricep pushdowns 12", "Hammer curls 10"] },
      "core": { "label": "Core — 2 rounds (no inversions)", "exercises": ["Pallof press 10 each", "Bird dogs 10 each", "Dead bugs (slow) 10 each"] },
      "finisher": "10 min incline walk (10%, 3.0 mph)"
    },
    {
      "day": "Friday", "subtitle": "Rowing Intervals", "type": "vigorous",
      "note": "First vigorous day back. Start conservative.",
      "vigorous": { "title": "Rowing — 20-25 min", "content": "Warm-up: 5 min easy row\n6 rounds: 2 min moderate-hard / 2 min easy recovery\nCool-down: 3 min easy row", "target": "15-20 vigorous minutes" },
      "core": { "label": "Core — 2 rounds", "exercises": ["Plank hold 30 sec", "Side plank 20 sec each", "Dead bugs 10 each"] }
    },
    {
      "day": "Saturday", "subtitle": "Lower Body", "type": "strength",
      "caution": "Moderate weights, higher reps. No bearing down.",
      "warmup": ["Banded glute bridges 20", "Banded clamshells 15 each", "Bodyweight squats 10"],
      "main": ["Leg press (moderate) 3×15", "Romanian deadlifts (light) 3×12", "Hip thrusts 3×12", "Walking lunges 3×10 each", "Leg curl 3×12", "Cable kickbacks 3×12 each", "Hip abductor machine 3×15"],
      "core": { "label": "Core — 2 rounds", "exercises": ["Dead bugs 12 each", "Bird dogs 12 each", "Plank hold 30 sec"] },
      "finisher": "15 min stair climber (moderate)"
    },
    {
      "day": "Sunday", "subtitle": "Tennis + Check-In", "type": "recovery", "rest": true,
      "activities": ["Tennis — normal intensity", "No swimming yet (3 more weeks)", "After tennis: weekly check-in", "6 PM reminder set"]
    },
    {
      "day": "Monday", "subtitle": "Spin or Bike Intervals", "type": "vigorous",
      "note": "Second vigorous day. You should be feeling good.",
      "vigorous": { "title": "Spin or Bike — 30-40 min", "content": "Option A: Spin class 70-80% effort\nOption B: Solo bike — 5 min warmup, 5 rounds 3 min hard / 2 min easy, 5 min cooldown", "target": "20-25 vigorous minutes" }
    },
    {
      "day": "Tuesday", "subtitle": "Active Recovery", "type": "rest", "rest": true,
      "activities": ["30 min incline walk (10-12%, 3.0 mph)", "Foam roll — 10 min", "Stretch or gentle yoga (no inversions)", "Sauna if available — 15 min"]
    },
    {
      "day": "Wednesday", "subtitle": "Zone 2 + Glute Activation", "type": "recovery",
      "note": "Heart rate 120-140 bpm. Fat-burning, recovery cardio.",
      "circuit": { "label": "Glute Activation — 2 rounds", "exercises": ["Banded glute bridges 20", "Banded lateral walks 15 each", "Fire hydrants 12 each", "Donkey kicks 12 each"] },
      "finisher": "35-40 min Zone 2: incline walk or easy bike"
    }
  ]
}
```

### Nutrition Data
- Protein: 130-140g
- Calories: 1500-1650
- Water: 80-100 oz
- Focus: Anti-inflammatory
- Note: "Carbs around training only. Supports insulin sensitivity."

### Sleep Data
- Target: 7.5 hrs
- Timeline: 7:30 PM last meal → 8:30 PM stop fluids → 9:00 PM screens off → 9:30 PM lights out → 5:30 AM wake
- Note: "Poor sleep = high cortisol = fat storage. You can't out-train it."

### Progress (placeholder state)
- Narrative: "Check in Sunday to unlock your progress story."
- Strength: "Train a week. Then the numbers show."
- Metrics: "Health trends appear after your first week."
- 12 Weeks: 12 bars, all "upcoming" state

## Tech Notes
- This is a prototype/UI only — no backend needed for Lovable
- All data is hardcoded
- The check-in modal flow should work as a UI demo (tap through steps)
- Collapsible day cards should animate smoothly
- Mobile-first (phone viewport)
