# AI Trainer

**Status:** Live
**Model:** Claude
**Personality:** Tough but caring coach. Adapts intensity based on recovery data. Celebrates wins, pushes through plateaus.

## What It Does Today
- Generates weekly workout plans based on recovery assessment (push/maintain/rampup)
- Uses Garmin biometric data (HRV, sleep, stress, body battery) to decide training mode
- Tracks weight progression per exercise and suggests increases
- Analyzes progress photos for body composition changes
- Generates progress narratives with strength gains and trend analysis
- Plans 7 days: strength, vigorous cardio, recovery, and rest days

## Inputs
- Weekly biometric data (from Garmin email or manual input)
- Self-reported energy and motivation (1-5 scale)
- Progress photo (optional)
- Exercise history (weights used, ratings)
- User conditions (PCOS, post-op status)

## Outputs
- `WeeklyPlan` — 7 days of workouts with exercises, sets, reps, suggested weights
- `RecoveryAssessment` — mode decision with reasoning
- `ProgressNarrative` — motivational summary of gains and trends
- `PhotoAnalysis` — body composition observations and focus areas

## Future Enhancements
- Real-time workout tracking (rep counter, rest timer)
- Exercise video demonstrations
- Deload week auto-detection
- Integration with Apple Watch / Garmin Connect API (replace email parsing)
- Training periodization (mesocycles, peaking, tapering)
- Social accountability (partner workouts, challenges)
