# Workout Card Typography & Density

**Tag:** `UX-002` — Card Typography & Density
**Status:** Backlog — needs designer review
**Priority:** UX polish

## Problems

### 1. Text too small in expanded workout cards
- Exercise names and set/rep/weight numbers are too tiny given the available screen width
- There's plenty of horizontal space being wasted — text should be larger and more readable, especially at the gym on a phone

### 2. Collapsed cards are too tall
- The collapsed day cards (showing badge, day name, date, workout name) take up too much vertical height
- The card has excessive padding/whitespace for the amount of content shown
- With 7 days in a week, tall collapsed cards push content far down the page

## Desired Behavior

### Expanded card (exercise list)
- Increase font size for exercise names
- Increase font size for set x rep (weight) notation
- Better use of horizontal space — the exercise name and numbers are far apart with empty space between

### Collapsed card
- Reduce vertical padding to make cards more compact
- Consider tighter layout: badge + day + date + workout name could potentially fit in fewer lines or a more condensed arrangement
- Goal: see more days at a glance without scrolling

## Notes

- Jessica will discuss specific sizing and layout with her designer agent
- Final decisions on exact font sizes, padding values, and layout changes TBD after that conversation
- Changes likely affect the DayCard/accordion component in `WorkoutsTab.tsx`
- Should remain mobile-first — readable at arm's length at the gym
