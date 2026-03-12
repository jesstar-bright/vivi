# Velle — Header & Branding Design Spec

> Rebrand from "Vivi" to "Velle" with a North Star brandmark replacing the text header.

**Status:** Approved
**Date:** 2026-03-12
**Author:** Jessica + Claude

---

## Decision Summary

### Name: Velle

- **Meaning:** Latin "to will, to want, to choose"
- **Why this name:** Aspirational identity meets luxury minimalism. Every workout is a choice. The name says "I decided to become this" without trying too hard.
- **SEO:** Zero fitness app competitors with this name. "Velle fitness" and "Velle app" are uncontested search terms. Nearest matches (Vellafit, Vellfit) are different names entirely.
- **Competitive audit:** 10+ alternative names were researched (Forma, Aura, Vireo, Vela, Luma, Vira, Vero, Alva, Vaux, Voss, Crea, Fero, Pario, Conde, Manifa, Fingo). All had direct fitness app conflicts except Velle and Crea. Velle was chosen for its aspirational tone over Crea's active/builder energy.

### Brandmark: The North Star

- **Shape:** Clean 4-point star with the pink-purple gradient (`#f093fb` to `#f5576c`). CSS uses `linear-gradient(90deg, ...)` (horizontal); the SVG mark uses a diagonal fill (bottom-left to top-right) for better visual balance on the star shape.
- **Symbolism:** The user's fitness age IS the north star — the fixed point everything else orbits toward. Metrics (weight, body battery, vigorous minutes, sleep) are the variables adjusted to move toward that star. Ties into the user's love of celestial/galactic aesthetics.
- **Usage:** The star mark replaces the word "Velle" throughout the app UI. The name "Velle" lives in the App Store listing, marketing, and any text-based contexts. Inside the app, the star is the identity.

### SVG Mark

```svg
<svg viewBox="0 0 100 100">
  <defs>
    <linearGradient id="velle-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f093fb"/>
      <stop offset="100%" style="stop-color:#f5576c"/>
    </linearGradient>
  </defs>
  <path d="M50 5 L55 43 L93 50 L55 57 L50 95 L45 57 L7 50 L45 43 Z" fill="url(#velle-gradient)"/>
</svg>
```

---

## Header Design

### Before (Vivi)
- "Vivi" in gradient text (1.6rem, bold)
- Chinchilla watermark (80px, 18% opacity, mix-blend-mode: multiply)
- Subtitle: "Garmin-Integrated | Push/Maintain | Post-Op Safe"

### After (Velle)
- North Star SVG mark (32px, centered)
- Subtitle: "WEEK 4 OF 12" (0.6rem, #BCBCBC, letter-spacing: 3px, uppercase)
- No chinchilla
- No feature/developer subtitle

### What changes
1. Remove the `<h1>Vivi</h1>` text header
2. Remove the chinchilla `<img>` from the header
3. Remove the "Garmin-Integrated | Push/Maintain | Post-Op Safe" subtitle
4. Add the North Star SVG mark (centered, 32px) with `role="img"` and `aria-label="Velle"` for screen reader accessibility
5. Add dynamic "WEEK N OF 12" subtitle — week number derived from the existing `currentWeek` variable; "12" is the fixed program length for the current 12-week cycle
6. Update `<title>` tag from "Vivi" to "Velle"

### What stays
- The pink-purple gradient (`#f093fb` to `#f5576c`) — used in the star and throughout the app
- The light background (`#F7F6F3`)
- The floating bubble nav bar
- All existing tab content (Workouts, Nutrition, Check-In)
- The Gentler Streak design language (white cards, subtle shadows, airy spacing)

---

## Brandmark Usage Throughout the App

| Context | Usage |
|---------|-------|
| **App header** | 32px star + week counter |
| **App icon** (home screen) | Star on white or gradient background |
| **Favicon** | 16px star |
| **Loading/splash screen** | Large star, centered, with "Velle" text below |
| **Tab bar accent** | Deferred — may explore tiny star as active tab indicator in a future iteration |
| **Milestone celebrations** | Star animation when hitting goals |
| **Empty states** | Faded star as placeholder icon |

---

## Chinchilla Status

The chinchilla mascot is being retired from the header and active UI. The mascot images remain in `assets/mascot/` and may be used as easter eggs in future iterations (e.g., hidden in milestone celebrations, achievement unlocks, or loading states), but the chinchilla is no longer part of the brand identity.

---

## Files to Update

- `prototype/index.html` — header HTML, CSS, `<title>` tag
- `README.md` — project name and description
- GitHub repo name — consider renaming from `vivi` to `velle` (optional, can keep for now)

---

## Rejected Alternatives

| Name | Why Rejected |
|------|-------------|
| Forma | Multiple direct competitors (Forma Gym, FORMA AI) |
| Aura | 6+ fitness apps with this name |
| Vivi | "Fitness by Vivi" and "viviFIT" exist |
| Vireo | "Vireo Fitness" exists as a business in Austin |
| Crea | Clean, but felt more like a design studio than a fitness brand |
| Vela | Vela Pilates and Vela Fitness (UK) exist |
| Luma | Luma Fitness gym + app exists |
| Vira | Vira Fitness app is a direct competitor |
| Vero | Vero Fit coaching app exists |
| Fero | Feroce Fitness and Fero Fitness exist |

| Mark | Why Rejected |
|------|-------------|
| Flame | Too similar to SWEAT app icon with pink gradient |
| Rising V | Looked like a chicken wishbone |
| Bloom | Looked like a whale tail |
| Guiding Star (elongated) | Unnecessary complexity |
| Star & Orbit | Too complex for small sizes |
| Starburst (6-point) | Too busy, didn't match "keep it simple" |
