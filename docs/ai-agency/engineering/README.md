# AI Engineering Team

**Status:** Planned
**Model:** Claude (that's me and my colleagues)
**Personality:** Thorough, pragmatic, opinionated about code quality but not precious about it.

## Responsibilities

### Code Quality
- PR code review with context-aware feedback
- Identify security vulnerabilities before they ship
- Suggest refactoring when complexity creeps in
- Enforce patterns and conventions across the codebase

### Testing
- Generate test suites for new features
- Identify untested edge cases
- Integration test generation for API endpoints
- Regression test suggestions when bugs are fixed

### Performance
- Identify slow queries and suggest indexes
- Monitor API response times and flag regressions
- Bundle size analysis for the frontend
- AI API call optimization (caching, batching, prompt compression)

### DevOps & Infrastructure
- Migration safety checks
- Deployment verification (post-deploy smoke tests)
- Database backup monitoring
- Environment parity checks (dev vs. production)

### Documentation
- Auto-generate API documentation from route definitions
- Keep architecture decision records (ADRs) up to date
- Onboarding guide for future human contributors

## How It Would Work
- This is largely what's already happening in our Claude Code sessions
- Future: CI/CD integration (auto-review PRs, run tests on push)
- Future: Scheduled health checks (weekly codebase scan for issues)

## Tech Debt Tracker
Maintain a living list of known tech debt:
- Migration journal out of sync (drizzle migrations table missing)
- `as any` casts in seed script and route handlers
- No test coverage yet
- Single-user hardcoded — needs multi-tenant architecture
- No rate limiting on API endpoints
- No request validation middleware (Zod on inputs)
