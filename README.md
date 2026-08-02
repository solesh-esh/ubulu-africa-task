# Ubulu Africa — QA Engineer Take-Home Assessment

![UI Tests](https://github.com/solesh-esh/ubulu-africa-task/actions/workflows/ui-tests.yml/badge.svg?branch=main)

## Walkthrough video

<!-- Replace with your Loom / YouTube link before submission -->
[Assessment walkthrough (video link TBD)]()

## Electives completed

- **Part 3** — OrangeHRM UI tests (Playwright + TypeScript) — see [`ui-tests/README.md`](ui-tests/README.md)
- **Part 5** — GitHub Actions CI/CD — [`.github/workflows/ui-tests.yml`](.github/workflows/ui-tests.yml)

## Repository structure

| Path | Contents |
|------|----------|
| `docs/` | Compulsory test plan (Digital Wallet transfer limits) |
| `ui-tests/` | Playwright UI automation suite |
| `.github/workflows/` | CI pipeline (lint, sharded Chromium, Firefox, report merge) |

## Quick start (UI tests)

```bash
cd ui-tests
cp .env.example .env   # add ORANGEHRM_USERNAME / ORANGEHRM_PASSWORD
npm ci
npx playwright install chromium firefox
npx playwright test --project=chromium --project=chromium-login
```
