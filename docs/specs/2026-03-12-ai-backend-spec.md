# Crea AI Backend — Design Spec

> The backend service that powers Crea's intelligent training: analyzing progress photos, ingesting Garmin health metrics, and generating personalized weekly workout and nutrition plans.

**Status:** Draft
**Date:** 2026-03-12
**Author:** Jessica + Claude

---

## Problem

The current Crea prototype is a static HTML app. Workouts are hardcoded, weeks don't advance, and there's no connection between the user's real-world data (body composition, recovery metrics, activity levels) and the training plan. For Crea to actually function as a personal trainer, it needs a backend that:

1. Reads health metrics from Garmin
2. Analyzes progress photos against the goal physique
3. Decides whether the upcoming week should be Push or Maintain
4. Generates a custom 7-day workout plan based on all inputs
5. Adjusts nutrition guidance based on body composition trends

---

## System Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Crea App    │────▶│  Crea API Server  │────▶│  Claude API  │
│  (Frontend)  │◀────│                  │◀────│  (Vision +   │
└─────────────┘     │  - Photo Upload  │     │   Text)      │
                    │  - Photo Storage │     └─────────────┘
                    │  - Plan Engine   │
                    │  - Check-in      │     ┌─────────────┐
                    │    Processing    │────▶│  Gmail       │
                    │                  │◀────│  (Garmin     │
                    └──────────────────┘     │   emails)    │
                             │               └─────────────┘
                             ▼
                    ┌──────────────────┐
                    │  Database         │
                    │  - User profile   │
                    │  - Weekly plans   │
                    │  - Metrics history│
                    │  - Check-in logs  │
                    └──────────────────┘
```

---

## Core Components

### 1. Garmin Data Ingestion

**Purpose:** Extract daily health metrics from Garmin's weekly email summary so the trainer AI has real recovery and activity data.

**Data points to extract:**
- Resting heart rate (RHR)
- Heart rate variability (HRV)
- Sleep score and sleep duration
- Steps
- Body battery (morning reading)
- Vigorous activity minutes
- Stress level average

**How it works:**
- Garmin Connect is configured to send weekly health summary emails to the user's Gmail
- When a check-in is submitted, the backend uses Claude's Gmail integration to:
  1. Search for the most recent Garmin health email (arrives weekly, typically Sunday/Monday)
  2. Pass the email content to Claude with a parsing prompt
  3. Claude extracts the structured metrics from the email body
  4. Extracted metrics are stored in the database with timestamp and 7-day averages computed
- Fallback: if no recent Garmin email found, prompt user to check Gmail or manually input key metrics
- Weekly aggregates are computed on demand for check-in analysis (7-day averages, trends vs. prior week)

**Email parsing approach:**
- Uses Claude's Gmail integration (configured via provider credentials)
- Garmin email contains all weekly stats in a formatted summary
- Claude extracts JSON-structured output from the email text
- No direct API authentication needed — leverages existing Gmail access

---

### 2. Progress Photo Analysis

**Purpose:** Compare the user's current physique to the goal physique and identify which muscle groups need more or less focus.

**How it works:**
1. User takes a photo via the Check-In tab (camera opens, photo is captured)
2. Photo is uploaded to Crea API → stored in private cloud storage (S3/R2), never served back to the frontend
3. API sends the photo to Claude Vision along with:
   - The goal physique reference images (stored server-side)
   - The user's previous check-in photo (if available)
   - The analysis protocol from `TRAINER_INSTRUCTIONS.md`
4. Claude returns a structured JSON analysis:

```json
{
  "observations": {
    "muscle_groups": {
      "shoulders": { "development": "moderate", "change_vs_last": "improving" },
      "arms": { "development": "low", "change_vs_last": "stable" },
      "core": { "development": "low", "change_vs_last": "stable" },
      "glutes": { "development": "moderate", "change_vs_last": "improving" },
      "legs": { "development": "moderate", "change_vs_last": "stable" },
      "back": { "development": "low", "change_vs_last": "not_visible" }
    },
    "estimated_body_fat_trend": "decreasing",
    "posture_notes": "Good alignment, slight anterior pelvic tilt"
  },
  "gap_analysis": {
    "priority_focus": ["core", "arms"],
    "on_track": ["shoulders", "glutes"],
    "reasoning": "Core and arm definition lag behind goal. Shoulders and glutes showing good response to current programming."
  },
  "recommended_adjustments": {
    "add_volume": ["core", "triceps", "biceps"],
    "maintain_volume": ["glutes", "shoulders"],
    "reduce_volume": [],
    "nutrition_flag": null
  }
}
```

**Privacy:**
- Photos are encrypted at rest
- Photos are never displayed in the UI (only the green checkmark)
- Photos are only sent to Claude API for analysis, never to any other service
- User can request deletion of all photos at any time

---

### 3. Weekly Check-In Engine

**Purpose:** Every Sunday, combine all data sources and produce the next week's plan.

**Input data for each check-in:**
| Source | Data |
|--------|------|
| Garmin | 7-day averages: RHR, HRV, sleep score, body battery, steps, vigorous minutes, stress |
| Photo | Structured analysis from Claude Vision (if photo uploaded) |
| Self-report | Energy level (1-5), motivation (1-5), any injuries/pain |
| History | Prior week's plan, adherence (which workouts were completed), weight log |
| Context | Post-op recovery timeline, menstrual cycle phase (if tracked), PCOS considerations |

**Decision flow:**

```
Garmin metrics + self-report
        │
        ▼
┌─────────────────────┐
│ Recovery Assessment  │
│                     │
│ Sleep < 6.5 avg?    │──── yes ──▶ Maintain
│ Body battery < 30?  │──── yes ──▶ Maintain
│ HRV trending down?  │──── yes ──▶ Maintain
│ Stress avg > 60?    │──── yes ──▶ Maintain
│ Post-op restricted?  │──── yes ──▶ Ramp-Up
│ Energy self < 3?    │──── yes ──▶ Maintain
│                     │
│ Otherwise           │──── ──── ──▶ Push
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Photo Gap Analysis   │
│ (if photo provided)  │
│                     │
│ Identify top 2-3    │
│ focus areas from     │
│ photo analysis       │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Plan Generation      │
│                     │
│ Mode: Push/Maintain  │
│ Focus: from photo    │
│ Volume: from mode    │
│ Exercises: from      │
│   focus + history    │
└─────────────────────┘
        │
        ▼
  7-day workout plan
  + nutrition targets
  + trainer message
```

**Recovery-first logic:** The system defaults to Maintain unless all recovery signals are green. This is intentional — overtraining with PCOS can spike cortisol and stall fat loss. The AI should err on the side of recovery.

---

### 4. Dynamic Workout Generation

**Purpose:** Generate a complete 7-day workout plan customized to the user's current mode, focus areas, available equipment, and recovery status.

**Plan structure (matches current frontend):**
```json
{
  "week_number": 4,
  "mode": "push",
  "date_range": { "start": "2026-03-30", "end": "2026-04-05" },
  "days": [
    {
      "day": "Monday",
      "title": "Glutes & Hamstrings (Push Focus)",
      "type": "strength",
      "warmup": ["5 min incline walk", "Hip circles x 10 each"],
      "exercises": [
        {
          "name": "Barbell Hip Thrust",
          "sets": 4,
          "reps": "8-10",
          "suggested_weight": "135 lbs",
          "suggested_weight_reasoning": "Matched last week's working weight — aiming for same RPE",
          "rest": "90s",
          "notes": "Squeeze at top for 2 count"
        }
      ],
      "cooldown": ["Pigeon stretch 60s each", "Hamstring stretch 60s each"],
      "estimated_duration": "55 min"
    }
  ],
  "weekly_cardio": {
    "zone2_sessions": 2,
    "zone2_duration": "30-40 min",
    "vigorous_target": "150 min",
    "notes": "Tennis on Sunday counts toward vigorous"
  },
  "nutrition": {
    "calories": 1750,
    "protein_g": 135,
    "carb_timing": "60% of carbs within 2 hours of training",
    "hydration": "80+ oz daily",
    "focus": "Anti-inflammatory: limit dairy, increase omega-3s"
  }
}
```

**Generation rules:**
- **Push weeks:** Higher volume (4 sets vs 3), heavier weights, more compound movements, progressive overload targets
- **Maintain weeks:** Lower volume (3 sets), moderate weights, more isolation and mobility work, active recovery days
- **Ramp-up weeks:** Reduced intensity, no heavy Valsalva, no inversions, bodyweight and light resistance focus
- **Focus area weighting:** If photo analysis flags "core" and "arms," those muscle groups get +1 exercise and +1 set per session where they appear
- **Exercise rotation:** Don't repeat the same exercises every week — rotate variations (e.g., barbell hip thrust → banded hip thrust → single-leg hip thrust) to prevent plateaus
- **Schedule awareness:** Knows Sunday = tennis, respects rest day placement around it
- **Smart weight suggestions:** Each exercise includes a `suggested_weight` based on:
  - Last completed weight for that exercise
  - User ratings from previous sessions (too heavy? too light? just right?)
  - Current week mode (push = +5 lbs, maintain = same, ramp-up = -10 lbs)
  - Rep/set targets for this week
  - No real-time weight input needed — user logs actual weight used + rating at end of workout

---

### 5. Week Advancement & Program Timeline

**Purpose:** Automatically advance the program week-over-week and manage the 12-week macro cycle.

**How it works:**
- Program start date is stored in user profile (2026-03-09 for Jessica)
- Current week is computed from: `ceil((today - start_date) / 7)`
- The system automatically advances — no manual "next week" button
- Each week's plan is generated during Sunday check-in and stored
- If the user misses a check-in, the system generates a Maintain week by default (safe fallback)

**12-week cycle:**
| Weeks | Phase | Description |
|-------|-------|-------------|
| 1-3 | Ramp-Up | Post-op recovery, building baseline |
| 4-6 | Foundation | Establishing movement patterns, moderate push |
| 7-9 | Intensify | Heavier loads, increased volume, more push weeks |
| 10-12 | Peak & Test | Maximum effort weeks, re-assessment, goal physique comparison |

After week 12, the system recalculates goals based on progress and starts a new cycle.

---

### 6. Trainer Communication

**Purpose:** The AI doesn't just generate plans silently — it communicates like a trainer through the Check-In tab.

**Message types:**
- **Weekly summary:** "Great week — you hit 4/5 workouts and your sleep averaged 7.2 hours. Body battery is trending up. Let's push this week."
- **Photo feedback:** "Your shoulders are really starting to pop. I'm adding extra core work this week since that's where we have the most room to grow."
- **Adjustment explanation:** "Switching to a Maintain week — your HRV dropped 15% and body battery has been below 30 for 3 days. Recovery is where gains happen."
- **Milestone celebration:** "Week 6 complete! You've lost 4 lbs while your hip thrust went from 95 to 135. That's recomposition, not just weight loss."

**Tone:** Follows the persona defined in `TRAINER_INSTRUCTIONS.md` — direct, encouraging, no-BS. Leads with what's working, then fine-tunes.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics/weekly` | Get current week's Garmin aggregates (parsed from most recent Garmin email) |
| GET | `/metrics/history` | Get metrics trend (last N weeks) |
| POST | `/checkin/photo` | Upload progress photo |
| POST | `/checkin/submit` | Submit weekly check-in (self-report + trigger plan generation) |
| GET | `/checkin/:week` | Get check-in results for a specific week |
| GET | `/plan/current` | Get current week's workout plan |
| GET | `/plan/:week` | Get a specific week's plan |
| GET | `/plan/history` | Get all generated plans |
| POST | `/workout/complete` | Log completed workout with actual weights and ratings |
| GET | `/progress/summary` | Get 12-week progress overview (weight, measurements, fitness age) |

---

## Tech Stack Recommendation

| Layer | Technology | Why |
|-------|-----------|-----|
| API Server | Node.js + Express (or Hono) | Lightweight, fast, JS matches frontend |
| Database | PostgreSQL | Structured data (plans, metrics, profiles), good for time-series queries |
| Photo Storage | Cloudflare R2 or AWS S3 | Private, encrypted, cost-effective for images |
| AI | Claude API (Sonnet for weekly plans, Opus for photo analysis, email parsing) | Vision capability for photos, structured output for plans, email content extraction |
| Auth | Simple token-based (single user for now) | No need for full auth system yet — just Jessica |
| Hosting | Railway or Fly.io | Easy deploy, free tier sufficient for single user |
| Email Parsing | Claude's Gmail integration | Extracts metrics from Garmin's weekly email summary without needing direct API access |

---

## Data Model

### User Profile
```
user_id, name, start_date, height, conditions (PCOS, etc.),
goal_weight, current_weight,
post_op_date, post_op_cleared (boolean)
```

### Weekly Metrics (one row per day)
```
date, rhr, hrv, sleep_score, sleep_hours, body_battery,
steps, vigorous_minutes, stress_avg, weight (optional)
```

### Check-Ins (one row per week)
```
week_number, date, photo_url (private), photo_analysis (JSON),
self_report_energy, self_report_motivation, self_report_notes,
mode_decision (push/maintain/rampup), mode_reasoning,
trainer_message
```

### Workout Plans (one row per week)
```
week_number, mode, plan_json (full 7-day plan),
nutrition_json, focus_areas, generated_at
```

### Exercise Log (one row per completed exercise)
```
date, exercise_name, suggested_weight, actual_weight_used,
sets_completed, reps_completed, weight_rating (good/too_heavy/too_light/incomplete),
notes
```

**Weight ratings legend:**
- `good` — Suggested weight was appropriate, completed all sets/reps as prescribed
- `too_heavy` — Couldn't complete all sets/reps; suggest lower weight or rep reduction next time
- `too_light` — Felt easy; could do more; suggest increasing weight next time
- `incomplete` — Didn't finish workout due to time/fatigue/injury; keep weight same for next attempt

---

## Privacy & Security

- **Photos never leave the backend** — uploaded to private storage, sent only to Claude API, never returned to the frontend
- **Gmail integration** — Uses Claude's Gmail access (user's existing provider credentials) to parse Garmin emails; no separate API tokens stored
- **Single-user system** — no multi-tenancy concerns for now, but data isolation is designed in from the start
- **No PII in logs** — metrics are logged by date, not by name
- **User can export or delete all data** — GDPR-style controls even though it's a personal app

---

## What This Spec Does NOT Cover

These are out of scope for now and will be addressed in future specs:

- **Real-time workout tracking** (rep counting, rest timers) — future feature
- **Social features** — this is a single-user app
- **Payment/subscription** — personal project
- **Apple Health / HealthKit integration** — Garmin is primary for now
- **Wearable real-time streaming** — daily syncs are sufficient

**Note:** This spec is backend-focused, but the mobile frontend (React Native / Expo) is in-scope as the primary interface for gym use. A separate frontend spec will detail mobile UI/UX.

---

## Next Steps

1. Review this spec and validate the approach
2. Create implementation plan (tasks, order, dependencies)
3. Set up the API server with a single endpoint (health check)
4. Implement Gmail email parsing for Garmin metrics extraction
5. Build the check-in submission flow
6. Integrate Claude API for photo analysis
7. Build the plan generation engine
8. Connect the frontend to the API
