# OrangeHRM UI Tests (Part 3)

Playwright TypeScript UI automation for the [OrangeHRM demo](https://opensource-demo.orangehrmlive.com).

## Setup

```bash
cd ui-tests
cp .env.example .env
npm ci
npx playwright install chromium firefox
```

## Run tests

```bash
# All authenticated + login tests (Chromium)
npx playwright test --project=chromium --project=chromium-login

# Leave tests only
npx playwright test tests/leave/apply-leave.spec.ts --project=chromium --workers=1

# Known-bug expected failures
npx playwright test tests/known-bugs/ --project=chromium
```

## Known-bug / expected-failure policy

Some tests in `tests/known-bugs/` document genuine defects in the OrangeHRM application under test, not mistakes in our automation. These tests are annotated with Playwright’s `test.fail()` so they continue to execute on every run while keeping the CI pipeline green. When a test marked `test.fail()` fails, Playwright treats that outcome as a pass — the failure is expected and the build remains successful. When the same test unexpectedly passes, Playwright reports a failure. That inversion is deliberate: it tells the team the application behaviour may have changed and someone should investigate whether the bug was fixed.

We do not use `test.skip()` for known product bugs. A skipped test disappears from the signal path; nobody is notified when a developer fixes the underlying issue, and the regression can reappear unnoticed. Expected-failure tests remain live documentation of what the product should do, and they convert automatically into actionable CI failures the moment the bug is resolved.

Each known-failure test carries an inline comment with a bug identifier (for example `BUG-001`), a plain-language description, the date the defect was observed, and a severity rating. When a `test.fail()` test fails the pipeline with an “unexpected pass” message, the developer should reproduce the scenario manually, confirm the application now behaves correctly, remove the `test.fail()` annotation (or delete the entire known-bug test if the behaviour is already covered elsewhere), and link the fix to the bug ID in the commit message. If the unexpected pass was a flaky false positive on the shared demo, document that in the test comment rather than removing the guard prematurely.

At a senior level, this policy separates “the pipeline is broken” from “the product is still wrong.” A permanently red pipeline trains teams to ignore CI; skipped tests hide fixed bugs. Expected failures keep honesty in both directions: we admit known product debt without blocking delivery, and we get an automatic alert when that debt is paid down.

## CI

GitHub Actions workflow: `.github/workflows/ui-tests.yml`

Expected-failure tests (`test.fail()`) do not require special workflow flags — Playwright exits with code 0 when only expected failures fail. An unexpected pass exits non-zero and fails the job.
