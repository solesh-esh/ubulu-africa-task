# Ubulu Africa — QA Engineer Take-Home Assessment

**Author:** Solomon Eshiet  
**Compulsory:** Part 1 (Test Strategy) · Part 6 (AI-Assisted QA)  
**Electives:** Part 3 (UI Automation) · Part 5 (CI/CD)

---

## 🎥 Walkthrough Video

[Watch here](YOUR_LINK_HERE)

---

![UI Tests](https://github.com/solesh-esh/ubulu-africa-task/actions/workflows/ui-tests.yml/badge.svg?branch=main)

---

## Elective Choices

I chose **Part 3 (UI automation)** and **Part 5 (CI/CD)** because together they demonstrate end-to-end quality thinking: tests are not valuable in isolation if they cannot run reliably in a pipeline. Part 3 covers realistic user flows, Page Object design, and handling a shared demo environment; Part 5 turns that suite into an automated gate with linting, multi-browser runs, sharding, and expected-failure handling for known product bugs. This combination reflects how I would deliver UI regression in a product team — executable tests plus CI that stays honest without being permanently red.

---

## Setup

### Prerequisites

- **Node.js 20+** (matches GitHub Actions; Node 18 is insufficient for current Playwright)
- **npm** 9+
- **Docker:** not required — tests run against the public OrangeHRM demo
- **OpenAI API key:** optional — only needed for the Part 6B AI test-data generator (`ai/`)

### Clone and install

```bash
git clone https://github.com/solesh-esh/ubulu-africa-task.git
cd ubulu-africa-task

# UI tests (Part 3)
cd ui-tests
npm ci
npx playwright install chromium firefox
```

### Environment variables

**UI tests** — copy and edit:

```bash
cp .env.example .env
# ORANGEHRM_USERNAME=Admin
# ORANGEHRM_PASSWORD=admin123  (public demo credentials)
```

**AI utility (Part 6B, optional)** — at repo root:

```bash
cd ..
cp .env.example .env
# OPENAI_API_KEY=sk-...
```

### Run UI tests

```bash
cd ui-tests

# Full Chromium suite (authenticated + login projects)
npx playwright test --project=chromium --project=chromium-login

# Firefox
npx playwright test --project=firefox --project=firefox-login

# Headed Chrome (local debugging)
npm run test:chrome

# Login specs only (headed)
npm run test:login
```

### Open HTML report

```bash
cd ui-tests
npm run report
```

---

## Repository Structure

```
ubulu-africa-task/
├── .github/workflows/
│   └── ui-tests.yml          # Part 5 — lint, sharded Chromium, Firefox, artifacts
├── ai/
│   ├── test-data-generator.ts
│   └── generated-test-data.json
├── docs/                     # Part 1 & Part 6 deliverables (PDFs)
├── ui-tests/                 # Part 3 — Playwright + TypeScript
│   ├── fixtures/             # Auth setup, base fixture
│   ├── helpers/
│   ├── pages/                # Page Objects
│   ├── tests/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── leave/
│   │   └── known-bugs/
│   ├── playwright.config.ts
│   └── package.json
├── .env.example              # AI utility keys (root)
├── package.json              # AI utility scripts (root)
└── README.md
```

---

## Known Gaps

This submission is complete for the assessment scope, but not production-ready. With more time I would add:

- **Test data cleanup on the shared OrangeHRM demo** — created employees are not torn down automatically; repeated runs accumulate records and can affect search/list assertions. A dedicated environment with reset APIs or per-run isolation would fix this.
- **Visual regression testing** — functional UI coverage exists, but layout/CSS regressions are not caught. I would integrate Percy or Applitools for critical flows (login, add employee, apply leave).
- **API-level limit tests for Part 1** — the Digital Wallet test plan defines oracles at the API layer (~70% automation target), but no Restful Booker / wallet API suite was built; only the strategy documents were delivered as compulsory Part 1.

---

## Dedicated Test Environment (Part 3)

Against the public OrangeHRM demo, tests accept flakiness from shared state, session contention, and demo resets. In a dedicated environment I would provision isolated tenant accounts with known leave balances, wire a database or admin API reset between runs, and remove `test.skip()` guards that exist only because the shared demo often shows zero leave balance. I would also run scheduled or long-soak suites against stable data instead of mutating a sandbox other candidates share. CI would target that environment via secrets and branch-deployed staging URLs rather than the live demo URL hard-coded in `playwright.config.ts`.

---

## Known-Bug Policy (Part 5)

Some failures are genuine product defects on the OrangeHRM demo, not automation bugs. Those tests live in `ui-tests/tests/known-bugs/` and use Playwright’s `test.fail()`: when the app still exhibits the bug, the test **fails as expected** and CI stays green; when the bug is fixed and the test **passes unexpectedly**, CI fails — signalling that someone should remove the annotation. We do not `test.skip()` known bugs, because skipped tests never alert the team when behaviour changes. This keeps the pipeline trustworthy while documenting product debt honestly.

---

## Further Reading

Detailed UI setup and CI notes: [`ui-tests/README.md`](ui-tests/README.md)
