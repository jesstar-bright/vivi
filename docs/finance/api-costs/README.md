# API Cost Monitoring

## Available APIs for Automated Cost Tracking

### Anthropic (Claude)
- **Admin API:** `https://api.anthropic.com/v1/organizations/{org_id}/usage`
- **What it returns:** Token usage by model, per day
- **How to calculate cost:**
  - Sonnet input: $3/MTok, output: $15/MTok
  - Haiku input: $0.80/MTok, output: $4/MTok
- **Auth:** Requires admin API key (different from regular API key)
- **Docs:** https://docs.anthropic.com/en/api/admin-api

### Google AI (Gemini)
- **Cloud Billing API:** Pull project-level costs
- **AI Studio dashboard:** Manual check at https://aistudio.google.com
- **Free tier:** Gemini Flash has generous free limits; costs only if exceeded
- **Docs:** https://cloud.google.com/billing/docs/apis

### Railway
- **Railway API:** GraphQL API at `https://backboard.railway.com/graphql/v2`
- **What it returns:** Project usage, deployment metrics, estimated costs
- **Also:** Dashboard at railway.com shows real-time spend
- **Docs:** https://docs.railway.com/reference/public-api

### AWS S3
- **Cost Explorer API:** `GetCostAndUsage` endpoint
- **What it returns:** Daily/monthly costs by service
- **Also:** Billing dashboard at console.aws.amazon.com/billing
- **Docs:** https://docs.aws.amazon.com/cost-management/latest/userguide/ce-api.html

## Planned: Cost Tracking Script

A script that runs monthly (or on-demand) to:
1. Query each API for the current billing period
2. Calculate total spend
3. Write a summary to this folder
4. Alert if any service exceeds a threshold (e.g., Anthropic > $50/month)

File format: `api-costs/2026-03-api-costs.md`

## Current Estimates (Pre-Scale)

| Service | Est. Monthly Cost | Notes |
|---------|------------------|-------|
| Anthropic | $5-15 | ~2 weekly meal plans + workout plans for 1 user |
| Google AI | $0 | Free tier sufficient for 1 user |
| Railway | $5 | Hobby plan |
| AWS S3 | <$1 | Progress photos only |
| **Total** | **~$10-20/month** | |
