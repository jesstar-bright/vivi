# Crea — Header & Branding Design Spec

> Rebrand from "Vivi" to "Crea" with a Diamond brandmark replacing the text header.

**Status:** Approved
**Date:** 2026-03-12
**Author:** Jessica + Claude

---

## Decision Summary

### Name: Crea

- **Meaning:** Latin "to create, to bring into being"
- **Why this name:** Active, feminine, builder energy — "I'm creating the body I want." Short (4 letters), sounds premium, easy to spell and search.
- **SEO:** Zero fitness app competitors with this name. Searching "Crea fitness app" returns only generic "how to create a fitness app" articles. Completely uncontested.
- **Competitive audit:** 16+ alternative names were researched across two rounds (Forma, Aura, Vireo, Vela, Luma, Vira, Vero, Alva, Vaux, Voss, Velle, Fero, Pario, Conde, Manifa, Fingo). All had direct fitness app conflicts except Crea and Velle. Crea was chosen for its active energy over Velle's softer "I choose" tone — this app is about building, not just deciding.

### Brandmark: The Diamond

- **Shape:** Faceted diamond with the pink-purple gradient (`#f093fb` to `#f5576c`). Subtle white inner facet lines give depth and convey the "cut" quality of a gem being formed.
- **Symbolism:** Pressure creates diamonds. The user is forging herself into something valuable through consistent effort — raw material becoming refined. Each workout, each check-in, each week is another cut that reveals the shape underneath.
- **Usage:** The diamond mark replaces the word "Crea" throughout the app UI. The name "Crea" lives in the App Store listing, marketing, and any text-based contexts. Inside the app, the diamond is the identity.

### SVG Mark

```svg
<svg viewBox="0 0 100 100">
  <defs>
    <linearGradient id="crea-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f093fb"/>
      <stop offset="100%" style="stop-color:#f5576c"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L82 38 L50 92 L18 38 Z" fill="url(#crea-gradient)"/>
  <path d="M18 38 L50 50 L82 38" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
  <path d="M50 50 L50 92" fill="none" stroke="white" stroke-width="2" opacity="0.2"/>
</svg>
```

---

## Header Design

### Before (Vivi)
- "Vivi" in gradient text (1.6rem, bold)
- Chinchilla watermark (80px, 18% opacity, mix-blend-mode: multiply)
- Subtitle: "Garmin-Integrated | Push/Maintain | Post-Op Safe"

### After (Crea)
- Diamond SVG mark (~30x32px, centered)
- Subtitle: "WEEK 4 OF 12" (0.6rem, #BCBCBC, letter-spacing: 3px, uppercase)
- No chinchilla
- No feature/developer subtitle

### What changes
1. Remove the `<h1>Vivi</h1>` text header
2. Remove the chinchilla `<img>` from the header
3. Remove the "Garmin-Integrated | Push/Maintain | Post-Op Safe" subtitle
4. Add the Diamond SVG mark (centered, ~30x32px) with `role="img"` and `aria-label="Crea"` for screen reader accessibility
5. Add dynamic "WEEK N OF 12" subtitle — week number derived from the existing `currentWeek` variable; "12" is the fixed program length for the current 12-week cycle
6. Update `<title>` tag from "Vivi" to "Crea"

### What stays
- The pink-purple gradient (`#f093fb` to `#f5576c`) — used in the diamond and throughout the app
- The light background (`#F7F6F3`)
- The floating bubble nav bar
- All existing tab content (Workouts, Nutrition, Check-In)
- The Gentler Streak design language (white cards, subtle shadows, airy spacing)

---

## Brandmark Usage Throughout the App

| Context | Usage |
|---------|-------|
| **App header** | 30x32px diamond + week counter |
| **App icon** (home screen) | Diamond on white or gradient background |
| **Favicon** | 16px diamond |
| **Loading/splash screen** | Large diamond, centered, with "Crea" text below |
| **Milestone celebrations** | Diamond animation when hitting goals |
| **Empty states** | Faded diamond as placeholder icon |
| **Tab bar accent** | Deferred — may explore tiny diamond as active tab indicator in a future iteration |

---

## Chinchilla Status

The chinchilla mascot is being retired from the header and active UI. The mascot images remain in `assets/mascot/` and may be used as easter eggs in future iterations (e.g., hidden in milestone celebrations, achievement unlocks, or loading states), but the chinchilla is no longer part of the brand identity.

---

## Files to Update

- `prototype/index.html` — header HTML, CSS, `<title>` tag
- `README.md` — project name and description
- GitHub repo name — consider renaming from `vivi` to `crea` (optional, can keep for now)

---

## Rejected Alternatives

| Name | Why Rejected |
|------|-------------|
| Forma | Multiple direct competitors (Forma Gym, FORMA AI) |
| Aura | 6+ fitness apps with this name |
| Vivi | "Fitness by Vivi" and "viviFIT" exist |
| Vireo | "Vireo Fitness" exists as a business in Austin |
| Velle | Clean SEO, but softer/passive tone — "to will" vs "to create" |
| Vela | Vela Pilates and Vela Fitness (UK) exist |
| Luma | Luma Fitness gym + app exists |
| Vira | Vira Fitness app is a direct competitor |
| Vero | Vero Fit coaching app exists |
| Fero | Feroce Fitness and Fero Fitness exist |
| Alva | Alva Fitness app exists |
| Vaux | VAUX fitness app exists |
| Voss | Voss Fitness and Vos-Fitness apps exist |
| Pario | Pario Health & Wellness exists in women's health space |
| Conde | Condé Wellness (gym + corporate wellness) exists |
| Fingo | Fintech/identity company, cluttered search results |
| Manifa | Saudi oil field association, odd brand fit |

| Mark | Why Rejected |
|------|-------------|
| Flame | Too similar to SWEAT app icon with pink gradient |
| Rising V | Looked like a chicken wishbone |
| Bloom | Looked like a whale tail |
| North Star (4-point) | Strong concept, but user preferred diamond's "forged through effort" meaning |
| Guiding Star (elongated) | Unnecessary complexity |
| Star & Orbit | Too complex for small sizes |
| Starburst (6-point) | Too busy, didn't match "keep it simple" |
| Origin (circle) | Too minimal — no distinct identity |
| Prism (triangle) | Generic, didn't convey "creation" strongly enough |
| Spark | Strong contender — "self-ignited energy" — but diamond's "forged through pressure" resonated more |
