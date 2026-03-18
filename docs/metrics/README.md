# KPIs & OKRs

Metrics that tell us if Crea is working — both as a product and for users' health journeys.

---

## Product Health KPIs

### Engagement
- **Weekly Active Users (WAU)** — users who open the app at least once per week
- **Check-in completion rate** — % of users who complete their weekly check-in
- **Workout completion rate** — % of planned workouts marked as done
- **Menu tab views per week** — are users actually using the meal plans?
- **Meal plan expand rate** — do users tap into ingredients/steps or just skim?
- **Session duration** — time spent in app per visit
- **Day-of-week engagement** — which days do users engage most?

### Retention
- **Week 1 → Week 4 retention** — % of users still active after 1 month
- **Week 1 → Week 12 retention** — % completing a full program cycle
- **Churn rate** — % of paying users who cancel per month
- **Reactivation rate** — users who churned but came back

### Conversion (once monetized)
- **Free trial → paid conversion rate** — target: 15-25%
- **Monthly vs. annual subscription split**
- **Revenue per user (ARPU)**
- **Customer acquisition cost (CAC)**
- **Lifetime value (LTV)** — target: LTV > 3x CAC

---

## User Health Journey KPIs

These are the metrics that matter most — does Crea actually help women with their fitness goals?

### Physical Progress
- **Weight trend direction** — % of users trending toward their goal weight
- **Avg weeks to first measurable progress** — how fast do users see results?
- **Strength progression** — % of users increasing weights over 4-week windows
- **Workout consistency streak** — avg consecutive weeks with 3+ workouts completed

### Nutrition Adherence
- **Meal plan follow-through** — self-reported or inferred from app engagement
- **Hydration goal hit rate** — % of days users hit 96 oz target
- **Recipe inspiration usage** — which cookbook recipes get used most?
- **Protein target accuracy** — are users consistently near their protein goals?

### Recovery & Wellbeing
- **Sleep trend** — avg sleep hours trending up over program duration
- **HRV improvement** — % of users showing HRV gains over 4+ weeks
- **Stress avg trend** — declining stress scores over time
- **Self-reported energy scores** — trending up over weeks?
- **Self-reported motivation scores** — stable or improving?

### PCOS-Specific Outcomes
- **Anti-inflammatory meal adherence** — % of meals tagged anti-inflammatory
- **Blood sugar-friendly meal ratio** — % of meals tagged glucose-friendly
- **Cycle regularity improvement** (future: if we add cycle tracking)
- **Symptom severity self-reports** (future: periodic symptom check-ins)

---

## OKRs by Phase

### Phase 1: Personal Use → Beta (Now → Q2 2026)
**Objective:** Validate that Crea delivers real results for the founder
- KR1: Complete 12-week program with 80%+ workout completion rate
- KR2: Reach goal weight within 10 lbs by week 12
- KR3: 3+ cookbook recipes become weekly rotation staples via AI adaptation
- KR4: Recruit 5 beta testers with PCOS or hormone-related fitness goals

### Phase 2: Beta → Early Users (Q3 2026)
**Objective:** Prove Crea works for other women, not just Jessica
- KR1: 10 beta users complete 4+ weeks with 60%+ retention
- KR2: 70%+ of beta users report the AI meal plans are "exciting enough to cook"
- KR3: Net Promoter Score (NPS) of 40+
- KR4: Identify top 3 features users request that we haven't built

### Phase 3: Launch → Growth (Q4 2026)
**Objective:** Launch on App Store and reach first 100 paying users
- KR1: App Store approval with no health compliance rejections
- KR2: 100 paying subscribers within 90 days of launch
- KR3: <5% monthly churn rate
- KR4: CAC < $15 via organic/social marketing

---

## How We'll Track

### Near-term (free/low-cost)
- Custom events table in PostgreSQL (user actions, timestamps)
- Weekly SQL queries for KPI dashboards
- Manual check-ins with beta users

### At scale
- Posthog (product analytics, funnels, retention cohorts) — free up to 1M events/month
- Stripe dashboard (revenue metrics)
- Custom admin dashboard in Crea (built when we have 50+ users)

---

## User Choice Tracking

Understanding WHAT users choose to engage with helps us prioritize:

- **Feature usage ranking** — which tabs/features get the most engagement?
- **Workout type preferences** — do users prefer strength, cardio, recovery days?
- **Meal preference patterns** — smoothie vs. cooked breakfast, which cuisines?
- **Cookbook source popularity** — Glucose Goddess vs. Salad Seasons vs. Wellness
- **Protein powder usage** — which powders appear most in followed meal plans?
- **Batch prep adoption** — do users follow batch prep suggestions?
- **AI regeneration rate** — how often do users regenerate/reject AI plans?
- **Time-of-day usage** — morning planners vs. evening preppers?
