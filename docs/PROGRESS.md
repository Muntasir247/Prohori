# Prohori — Build Progress

Phased build from `docs/PROHORI_DOC02.md` Section 12. Build in order; start a fresh
session per phase; each phase inspects existing files first, keeps working code,
implements real logic, runs tests, and updates this file at the end.

Phases 00–08 and 14 produce a demoable loop — reach those first, then add the rest.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done.

## Phases

- [~] **Phase 00 — Project context.** Put the plan in the repo (CLAUDE.md,
  docs/PROGRESS.md, .gitignore, README.md). _Done when:_ a new session can state
  the five non-negotiable rules from CLAUDE.md.
- [ ] **Phase 01 — Scaffold and environment.** Run frontend, backend and database
  locally with one command. _Done when:_ frontend calls `/api/v1/health` through
  the Vite proxy.
- [ ] **Phase 02 — Design system.** Build tokens and the 29 components. _Done when:_
  no hard-coded colors outside `tokens.css`; axe reports no serious issues.
- [ ] **Phase 03 — Database and seed data.** Create the schema and realistic
  simulated data. _Done when:_ audit update fails, seeded counts match.
- [ ] **Phase 04 — Authentication and roles.** Sessions, guest identity, roles and
  account screens. _Done when:_ S03–S08 and S22 work end to end in both languages.
- [ ] **Phase 05 — Deterministic pipeline.** Normalization, masking, rules, payment
  model and fusion, with no LLM. _Done when:_ rule-only High works offline with
  Bangla text.
- [ ] **Phase 06 — Retrieval and Claude integration.** Knowledge retrieval, Haiku
  and Sonnet stages, orchestrator. _Done when:_ CLI check returns valid results,
  and the kill-key test gives fallback.
- [ ] **Phase 07 — Check flows end to end.** Connect the user journey to the real
  pipeline. _Done when:_ a guest gets a real Bangla result at 360 px.
- [ ] **Phase 08 — Reviewer workbench.** Queue, case detail, decisions, audit and
  notifications. _Done when:_ a report from S17 is decided in S26, and a later
  check on that number hits the hard rule.
- [ ] **Phase 09 — Analytics, repeat numbers, campaigns.** Dashboard, repeat
  numbers, clustering, export, nightly job. _Done when:_ charts move after a
  decision, with no hard-coded chart data.
- [ ] **Phase 10 — Differentiators.** Pressure Pause, sharing, Already Sent Money,
  read aloud. _Done when:_ all four work on a low-end Android Chrome profile.
- [ ] **Phase 11 — Admin and partner API.** Admin screens and partner keys.
  _Done when:_ publishing a pattern changes retrieval results.
- [ ] **Phase 12 — Evaluation.** Measure quality and stop regressions. _Done when:_
  thresholds and unsafe gate enforced.
- [ ] **Phase 13 — Hardening.** Security, Bangla, accessibility and responsive pass.
  _Done when:_ every R-item has a test or a documented reason.
- [ ] **Phase 14 — Deployment, demo and submission.** Live demo link, video and
  final form check. _Done when:_ demo works twice in a row, and form answers match
  what was built.
