# Multi-User Accounts & Profile Menu

**Date:** 2026-03-18
**Priority:** high
**Effort:** large

## The Problem
Crea is currently single-user with a hardcoded profile. To sell on app stores and onboard other users, we need full authentication, user-scoped data, and a profile/settings system. Users also need places to manage their recipes, pantry, photos, and connected devices.

## The Idea

### Authentication & Multi-User
- OAuth setup (Google, Apple Sign-In) for frictionless onboarding
- User registration flow with health profile collection (conditions, goals, dietary restrictions)
- All database tables scoped to `userId` (workoutPlans, mealPlans, exerciseLogs, checkIns, etc.)
- Each user gets their own AI Trainer and AI Dietician context built from their profile

### Profile Menu (top-right avatar bubble)
Based on the UI mockup, tapping the avatar opens a menu with:

- **Settings** — Notification preferences, units (lbs/kg), timezone, data privacy controls, subscription management
- **Recipes** — Browse/search the recipe library, favorite recipes, add custom recipes from their own cookbooks
- **Pantry** — Manage protein powders and staple ingredients with exact macros (used by AI Dietician)
- **Photo Album** — Progress photos organized by week/date, before/after comparisons
- **Integrations** — Connect wearables (Garmin, Oura, Whoop, Apple Health), connect period trackers (Clue, Natural Cycles, Flo via HealthKit)
- **Account** — Email, password, subscription status, data export, delete account

### Backend Changes Needed
- New `users` table (replaces single `userProfiles` row) with auth provider ID
- Add `userId` foreign key to: `mealPlans`, `workoutPlans`, `checkIns`, `weeklyMetrics`, `exerciseLogs`, `recipes` (custom), `userPantry`
- Auth middleware that extracts user from JWT/session instead of static API token
- User onboarding API: collect conditions, goals, dietary restrictions, wearable connections
- Per-user recipe library (shared base + user-added custom recipes)
- Per-user pantry management CRUD endpoints

### What This Enables for AI Agents
- **AI Trainer:** Generates plans based on THIS user's conditions, history, metrics, and goals
- **AI Dietician:** Uses THIS user's dietary restrictions, pantry, favorite recipes, and health conditions
- **AI Support:** Knows the user's current state for contextual help
- Future: cycle-aware training/nutrition once period tracker integration is built

## Why Later (Not Now)
- Crea works great as a single-user app for validation
- Need to prove the AI agents deliver real results before scaling to other users
- Auth + multi-tenant is a large architectural change — do it right, once
- Beta testers can use it first with manual profile setup before full self-serve onboarding

## UI Reference
Profile avatar (top-right circle) shows user's first initial (e.g. "J" for Jessica). Tapping it opens a **dropdown menu** overlaying the current screen with links to: Settings, Recipes, Pantry, Photo Album, Integrations, Account. Tapping a link navigates to that sub-page. Tapping outside the dropdown closes it.

## Notes
- Clerk or Supabase Auth are the fastest paths to OAuth
- Apple Sign-In is REQUIRED if you offer any third-party login on iOS App Store
- Consider: should onboarding ask about cycle tracking upfront, or surface it later in Integrations?
- Recipe library should allow users to photograph cookbook pages and have AI extract the recipe (future idea)
