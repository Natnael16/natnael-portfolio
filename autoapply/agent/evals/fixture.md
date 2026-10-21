# Eval fixture (fictional — not the operator)

This corpus is a **frozen, made-up candidate** so match/draft regressions do not depend on whoever is using the dashboard. The live agent reads the real profile from SQLite + the uploaded PDF. If these files described a real person, every hire of a new user would invalidate the suite.

Allowed employers on this résumé: **Northline**, **Cedar Clinic Systems**.  
Allowed metrics: **~40k workspaces**, **28% fewer failed-payment tickets**.  
Not on résumé (must never appear in drafts): Go, C++, HFT, people-manager, staff/principal title, revenue %, “widget SDK”.

```
Jordan Hale
Remote, United States
jordan.hale@example.com | +1-555-0199
linkedin.com/in/jordanhale-eval | github.com/jordanhale-eval

SENIOR SOFTWARE ENGINEER — Northline (B2B workflow SaaS), 2021–present
- Own the TypeScript / Node billing API (Fastify, PostgreSQL) serving ~40k workspaces
- Shipped React admin for dunning and plan changes; cut failed-payment tickets 28% (ops metric, 2023)
- AWS (ECS, SQS, RDS); idempotent Stripe webhook consumers
- Mentored two mid-level engineers on the payments squad (IC, not a manager title)

SOFTWARE ENGINEER — Cedar Clinic Systems, 2018–2021
- Internal tools for clinic operations: React, Node, REST
- PostgreSQL reporting jobs (no clinical ML, no device firmware)

Stack: TypeScript, Node.js, React, PostgreSQL, AWS, Stripe webhooks
Not claimed: Kubernetes-from-scratch, Go, C++, ML, sales, security clearance
```

Profile knobs used by the runner: senior band, remote-only, US work auth, **no sponsorship**, **empty salary band**, target titles SWE / Senior SWE / Full Stack, exclude sales/recruiter/unpaid, FullTime only.
