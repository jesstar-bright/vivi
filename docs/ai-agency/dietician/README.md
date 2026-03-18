# AI Dietician

**Status:** Live
**Models:** Gemini (PCOS nutrition consultation) + Claude (meal plan generation)
**Personality:** Authoritative expert, not suggestive. Decisive. Speaks like a nutritionist who knows your body.

## What It Does Today
- Consults on weekly nutritional strategy based on workout plan (Gemini)
- Generates 7-day meal plans using cookbook recipe library as inspiration (Claude)
- Adapts recipes for lactose intolerance and nuts+sugar reaction
- Enforces realistic protein counts (no inflation)
- Plans batch-prep continuity across days
- Factors in PCOS-specific considerations (anti-inflammatory, blood sugar, iron, magnesium)

## Inputs
- Weekly workout plan (exercises, intensity, rest days)
- User health profile (PCOS, weight goals, conditions)
- Recipe library (25 cookbook recipes)
- Protein powder inventory (5 powders with exact macros)

## Outputs
- `NutritionGuidance` — weekly focus, per-day guidance, PCOS considerations
- `WeeklyMealPlan` — 7 days × 3 meals with ingredients, steps, macros, batch prep notes

## Future Enhancements
- Grocery list generation from weekly meal plan
- Seasonal recipe rotation (spring/summer/fall/winter ingredients)
- Learn from user feedback ("I didn't like this meal" → fewer similar suggestions)
- Integration with grocery delivery APIs
- Cycle-aware nutrition (adjust macros based on menstrual cycle phase)
