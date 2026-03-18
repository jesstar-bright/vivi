# Automated Expense Tracking

## Goal: Minimize Human Input

The less Jessica has to manually track, the better. Here's the automation strategy:

## Tier 1: Fully Automated (Zero Human Input)

### API Costs — Queryable via APIs
| Service | API Available? | How to Track |
|---------|---------------|--------------|
| **Anthropic (Claude)** | Yes — `GET /v1/organizations/{org_id}/usage` | Query usage endpoint monthly, log token counts + costs |
| **Google AI (Gemini)** | Yes — Google Cloud Billing API | Pull daily costs from billing dashboard or API |
| **Railway** | Yes — Railway API | Query project usage, compute hours, bandwidth |
| **AWS S3** | Yes — AWS Cost Explorer API | Pull storage + transfer costs |

**Implementation:** A monthly cron job or script that queries each API and writes a cost summary to this folder.

### Bank Transactions (Once Business Account Exists)
| Tool | How It Works | Cost |
|------|-------------|------|
| **Mercury** (recommended) | API access to all transactions, auto-categorize | Free business checking |
| **Plaid** | Connect any bank account, pull transactions programmatically | Free for personal use |
| **QuickBooks Self-Employed** | Auto-imports from bank, categorizes, tracks mileage | $15/month |

**Best option:** Mercury bank account → all Crea expenses on one card → Mercury API auto-exports monthly transactions → AI CFO agent categorizes them.

## Tier 2: Low-Effort (Minimal Human Input)

### Receipt Capture
- Forward email receipts to a dedicated email (e.g., receipts@creahealth.com)
- AI agent periodically scans inbox, extracts vendor/amount/date, categorizes
- Or: use a receipt scanner app (Dext, Expensify) that OCRs photos

### Subscription Tracking
Maintain a living list of recurring costs:

| Service | Monthly Cost | Category | Billing Date |
|---------|-------------|----------|-------------|
| Railway | ~$5 | Infrastructure | 1st |
| Anthropic API | Variable | AI/ML | Monthly |
| Google AI API | Variable | AI/ML | Monthly |
| GitHub | Free | Development | — |
| Domain (annual) | ~$1/mo | Infrastructure | Annual |
| Apple Developer | ~$8.25/mo | App Store | Annual |
| AWS S3 | <$1 | Infrastructure | Monthly |

## Tier 3: Needs Human Input (But Rarely)

- One-time purchases (equipment, books, courses) — snap a photo or forward receipt
- Meals/travel with business purpose — note the business reason
- Home office square footage — measure once, deduct annually

## Monthly Auto-Report Format

Each month, the AI CFO generates a summary file:

```
finance/expenses/2026-03-expenses.md
```

With sections:
- Total spend by category
- API costs breakdown (tokens used, cost per call)
- Flagged items needing human review
- Year-to-date running totals
- Comparison to prior month
