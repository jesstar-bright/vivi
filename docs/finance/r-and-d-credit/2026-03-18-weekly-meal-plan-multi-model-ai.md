# R&D Activity: Multi-Model AI Weekly Meal Plan Generation

**Date(s):** 2026-03-18
**Developer(s):** Jessica Talbert (+ Claude AI as development tool)
**Hours:** ~6 hours

## Business Purpose
Crea's existing single-day meal generation was producing generic meals that didn't inspire cooking, leading the user to default to fast food. Protein estimates were inflated for realistic portion sizes. There was no way to see the full week for meal prep planning, and no nutritional expertise layer for PCOS-specific guidance.

## Technical Uncertainty
1. **Multi-model orchestration:** Could we reliably chain Gemini (nutrition consultation) → Claude (meal generation) where one model's structured output feeds another model's prompt? Would the second model respect constraints set by the first?
2. **7-day coherent meal planning:** Could a single Claude API call generate a coherent 7-day meal plan (~16K tokens output) that maintains batch-prep continuity across days (e.g., "make double chicken Monday → use leftovers Tuesday")?
3. **Recipe-aware generation:** Could we seed Claude with 25 real cookbook recipes and have it intelligently adapt them (swap ingredients for dietary restrictions) while maintaining realistic macronutrient counts?
4. **Protein accuracy:** Prior attempts consistently inflated protein counts. Could prompt engineering with explicit per-ingredient protein values (e.g., "4oz chicken = 26g protein") produce realistic estimates?
5. **Structured output validation:** Could Zod schema validation reliably parse a 7-day nested meal plan from a single generation call, or would the output be too large/complex for consistent JSON formatting?

## Experimentation / Approach
1. Built Gemini nutritionist service (`gemini-nutritionist.ts`) with structured output (Zod-validated `NutritionGuidance` schema). Had to implement JSON extraction regex because Gemini sometimes returns preamble text before JSON.
2. Designed `WeeklyMealPlanSchema` — nested 7-day structure with per-meal `inspired_by` and `adaptations` fields to track cookbook usage.
3. Rebuilt meal generator system prompt to include full recipe library, protein powder inventory with exact macros, and Gemini's per-day guidance. Required `maxTokens: 16000` for the full 7-day output.
4. Added explicit protein reference table in the prompt ("4oz chicken breast = ~26g protein", "1 large egg = 6g protein") to combat inflation.
5. Built fallback: if Gemini fails (rate limit hit during testing), defaults are generated and Claude proceeds without Gemini guidance. This graceful degradation was verified when Gemini returned a 429 error.
6. Implemented fire-and-forget pattern for auto-triggering meal generation after check-in, so the user gets their workout plan immediately without waiting 30+ seconds for meal generation.

## Resolution
- Multi-model chain works reliably: Gemini produces structured guidance, Claude consumes it and generates coherent 7-day plans
- Batch-prep continuity works: Monday's "make double salmon" correctly appears as Tuesday's "Leftover Salmon Rice Bowl"
- Recipe adaptation works: cookbook recipes are referenced with `inspired_by` field and dietary modifications documented in `adaptations`
- Protein counts are realistic with the reference table approach
- Zod validation handles the large 7-day output successfully on first attempt
- Graceful degradation confirmed when Gemini hit rate limit

## Evidence
- Git commits: `b52eccc` (main implementation), `0538194` (project organization)
- Key files: `server/src/services/gemini-nutritionist.ts`, `server/src/services/meal-generator.ts`, `server/src/routes/meals.ts`, `server/src/db/schema.ts`, `client/src/components/MenuTab.tsx`
- Migration: `server/drizzle/0002_groovy_songbird.sql` (recipes, userPantry tables)
