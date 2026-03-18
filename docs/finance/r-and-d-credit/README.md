# R&D Tax Credit Documentation

## What Is It?
The federal R&D tax credit (IRC Section 41) lets startups offset up to **$250,000/year in payroll taxes** (or reduce income tax). Software development qualifies when you're building something technically uncertain — not just wiring up known solutions.

## Does Crea Qualify?
**Yes, strongly.** The IRS four-part test:

1. **Permitted purpose** — Developing a new or improved product ✓ (Crea is a novel AI-powered health platform)
2. **Technological uncertainty** — You didn't know if it would work ✓ (Could Claude generate nutritionally accurate 7-day meal plans? Could Gemini provide reliable PCOS guidance? Would the multi-model architecture produce coherent results?)
3. **Process of experimentation** — You tried things, iterated, failed, retried ✓ (Zod validation + retry loops, prompt engineering, schema design)
4. **Technological in nature** — Relies on engineering/CS principles ✓ (AI/ML, database design, API architecture)

## How to Document (IRS-Ready Format)

Each development activity gets a log entry. The key is capturing **what was uncertain** and **what you tried**. You do NOT need to write these in real-time — they can be reconstructed from git history, but it's easier to log as you go.

### Template for Each Activity

```markdown
## [Activity Title]
**Date(s):** YYYY-MM-DD to YYYY-MM-DD
**Developer(s):** Jessica Talbert (+ Claude AI as development tool)
**Hours:** ~X hours

### Business Purpose
Why did we need to build this?

### Technical Uncertainty
What didn't we know? What could have failed? Why wasn't the answer obvious?

### Experimentation / Approach
What did we try? What iterations did we go through? What failed before it worked?

### Resolution
What was the outcome? Did it work? What tradeoffs were made?

### Evidence
- Git commits: [commit hashes]
- Files changed: [list]
```

## Activity Log

Activities are logged as individual files in this folder, named by date and feature.
See the first entry as an example.
