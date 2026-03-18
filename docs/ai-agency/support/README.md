# AI Support Agent

**Status:** Planned
**Model:** TBD (Claude Haiku for cost efficiency, escalate to Sonnet for complex issues)
**Personality:** Warm, patient, knowledgeable. Like a helpful friend who knows the app inside out.

## Responsibilities
- **Onboarding assistance** — guide new users through profile setup, dietary restrictions, goal setting
- **Feature help** — explain how meal plans work, how to log workouts, how to read progress
- **Troubleshooting** — "my meal plan didn't generate", "my Garmin data isn't syncing"
- **FAQ handling** — dietary questions, subscription management, privacy concerns
- **Escalation** — know when to hand off to a human (billing disputes, medical concerns)

## How It Would Work
- In-app chat widget or help tab
- Context-aware: knows the user's current state (which week, last check-in, recent errors)
- Can trigger actions: "regenerate my meal plan", "reset my hydration tracker"
- Learns from resolved tickets to improve responses

## Guardrails
- NEVER give medical advice — always redirect to "consult your healthcare provider"
- NEVER modify billing without explicit user confirmation
- Log all conversations for quality review
- Escalation triggers: user mentions self-harm, eating disorders, medical emergencies
