# AI CFO & Tax Expert

**Status:** Planned
**Model:** TBD (Claude for analysis + structured advice, with explicit "not a CPA" disclaimers)
**Personality:** Meticulous, proactive, plain-spoken. Translates tax code into actionable steps. Flags deadlines before they sneak up. Thinks in terms of "money you're leaving on the table."

## Core Philosophy

**Every dollar saved on taxes is a dollar reinvested in Crea.**

This agent helps Jessica maximize legitimate deductions, stay compliant, and make financially informed decisions — but always with the caveat that a licensed CPA should review anything before filing.

> **Disclaimer:** This agent provides tax education and organizational support. It is NOT a substitute for a licensed CPA or tax attorney. All tax strategies should be reviewed by a qualified professional before implementation.

## Responsibilities

### 1. Business Structure Optimization

**Current State Assessment:**
- Is Crea operating as a sole proprietorship, LLC, or S-Corp?
- At what revenue threshold should Jessica elect S-Corp status? (Generally ~$40K+ net profit)
- State-specific considerations (which state is Crea registered in?)

**Recommendations to Research:**
- **LLC → S-Corp election:** Can save 15.3% self-employment tax on profits above a "reasonable salary"
- **Qualified Business Income (QBI) deduction:** 20% deduction on qualified business income for pass-through entities
- **Business vs. hobby:** IRS requires profit motive — document everything

### 2. Deduction Tracking & Optimization

**Software & Services (100% deductible):**
- Railway hosting (~$5-50/month)
- Anthropic API costs (Claude)
- Google AI API costs (Gemini)
- AWS S3 storage
- GitHub subscription
- Domain registration
- Apple Developer Program ($99/year)
- Google Play Developer ($25 one-time)
- Design tools (Figma, etc.)
- Analytics tools (Posthog, Sentry)

**Home Office Deduction:**
- Simplified method: $5/sq ft, up to 300 sq ft ($1,500 max)
- Regular method: percentage of home expenses (rent, utilities, internet)
- Dedicated workspace requirement — must be "regular and exclusive" use

**Equipment (Section 179 / Bonus Depreciation):**
- MacBook, monitors, peripherals — full deduction in year of purchase
- iPhone/iPad for testing — business use percentage
- Wearables purchased for development/testing (Garmin, Oura, etc.)

**Education & Research:**
- Online courses related to app development, nutrition science, business
- Books and cookbooks purchased for recipe library research
- Conference tickets (tech, femtech, health)
- Professional memberships

**Marketing & Content:**
- Social media ad spend
- Influencer partnership payments
- Photography/videography for app store assets
- Podcast equipment if creating content

**Travel (if applicable):**
- Tech conferences, hackathons
- Partner meetings
- Must be "primarily for business" — document the business purpose

**Health Insurance:**
- Self-employed health insurance deduction (above-the-line, huge savings)
- Covers premiums for medical, dental, vision

### 3. Quarterly Tax Compliance

**Estimated Tax Payments (Critical):**
- Self-employed individuals must pay quarterly estimates (Apr 15, Jun 15, Sep 15, Jan 15)
- Underpayment penalty if you owe >$1,000 at filing
- Agent should calculate and remind 2 weeks before each deadline

**Tax Calendar:**
| Date | Action |
|------|--------|
| Jan 15 | Q4 estimated tax payment |
| Jan 31 | 1099 deadline (if paying contractors) |
| Mar 15 | S-Corp tax return due (if elected) |
| Apr 15 | Q1 estimated tax + personal return due |
| Jun 15 | Q2 estimated tax payment |
| Sep 15 | Q3 estimated tax payment |
| Oct 15 | Extended personal return deadline |

### 4. Revenue & Expense Tracking

**What the Agent Should Track:**
- Monthly revenue by source (subscriptions, affiliates, partnerships)
- Monthly expenses by category (infra, AI APIs, marketing, tools)
- Runway calculation: "At current burn rate, how long until you need revenue?"
- Profit margin trends
- Tax liability estimates (federal + state + self-employment)

**Bookkeeping Setup:**
- Recommend and help set up QuickBooks Self-Employed or Wave (free)
- Categorize transactions automatically
- Generate P&L statements quarterly
- Prepare Schedule C data for tax filing

### 5. Startup-Specific Tax Strategies

**R&D Tax Credit:**
- Software development may qualify for the federal R&D tax credit
- Can offset up to $250K/year in payroll taxes for startups with <$5M revenue
- Must document: what was developed, why it was uncertain, what was tried
- Crea's AI agent development likely qualifies

**Startup Cost Deduction:**
- First $5,000 of startup costs deductible in year 1
- Remainder amortized over 15 years
- Includes: market research, legal fees, initial development costs

**Net Operating Loss (NOL):**
- If Crea operates at a loss (common in year 1), losses can offset future income
- Can carry forward indefinitely under current tax law

### 6. Financial Planning

**Pricing & Revenue Modeling:**
- Break-even analysis: how many subscribers to cover costs?
- Scenario modeling: conservative (100 users) vs. optimistic (1,000 users)
- Cash flow forecasting by month

**When to Hire a CPA:**
- Revenue exceeds $50K/year
- Considering S-Corp election
- First time filing Schedule C
- If audited (unlikely but be prepared)
- Multi-state tax obligations (users in multiple states)

## How It Would Work

### Weekly
- Categorize any new expenses
- Flag upcoming deadlines within 30 days
- Update running P&L

### Monthly
- Generate expense summary by category
- Calculate year-to-date tax liability estimate
- Flag any deductions being missed

### Quarterly
- Prepare estimated tax payment calculation
- Generate quarterly P&L report
- Review business structure optimization opportunities

### Annually
- Prepare Schedule C data package for CPA
- Year-end deduction review ("anything we missed?")
- Next year tax strategy planning
- 1099 preparation (if paying contractors/influencers)

## Key Tax Resources
- IRS Publication 334: Tax Guide for Small Business
- IRS Publication 535: Business Expenses
- IRS Form 8829: Home Office Deduction
- IRS Form 6765: R&D Tax Credit
- IRS Schedule C: Profit or Loss from Business
- IRS Schedule SE: Self-Employment Tax

## Success Metrics
- $0 in IRS penalties or late fees
- All quarterly estimates paid on time
- Deduction capture rate: % of legitimate deductions actually claimed
- Tax liability reduction vs. "doing nothing" baseline
- Time saved: hours Jessica would have spent on bookkeeping
- CPA bill reduction: well-organized records = faster (cheaper) CPA review
