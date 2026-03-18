# Ops: Logging & Maintenance

Monitoring, error tracking, uptime, and operational health.

## Logging
- API request/response logging (latency, errors, status codes)
- AI generation failures and retries (Claude + Gemini)
- User action events (check-in completed, meal plan viewed, workout completed)
- Background job status (weekly meal plan auto-generation)
- Database query performance

## Monitoring & Alerts
- Uptime monitoring (Railway health checks)
- Error rate thresholds (alert if >5% of requests fail)
- AI API spend tracking (daily/weekly cost alerts)
- Database storage growth
- Response time p50/p95/p99

## Maintenance
- Database backup schedule and restore testing
- Dependency updates (security patches)
- AI model version migration plan (when Claude/Gemini release new versions)
- Data retention policy (how long to keep old meal plans, metrics, photos)
- Seed data updates (new recipes, new protein powders)

## Tools to Evaluate
- Sentry (error tracking)
- Posthog or Mixpanel (product analytics)
- BetterStack or Railway native (uptime)
- Grafana (dashboards — if we outgrow Railway metrics)
