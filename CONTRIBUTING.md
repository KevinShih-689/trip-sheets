# Contributing

Thanks for your interest in improving Trip Sheets! This is a small, deliberately minimal project (Google Sheets → static SSG → GitHub Pages, no backend). Contributions that keep that architecture intact are very welcome.

## Ground rules

- **Never commit secrets or personal data** — no service-account keys, real PNRs, booking numbers, addresses, or `.env` files.
- Keep the **no-backend / no-database** architecture. Data comes from Google Sheets at build time only.
- Preserve the **sensitive-field guarantee** (see [`SECURITY.md`](SECURITY.md)) when touching Backlog parsing.

## Prerequisites

- **Node ≥ 22** (CI and deploy run on Node 22; the toolchain — Vite/Vitest — requires it)
- **pnpm 9** (`corepack enable` or `npm i -g pnpm@9`)

## Getting started

```bash
pnpm install
pnpm fetch-sheet:sample   # seed committed sample data — no Google Cloud needed
pnpm dev                  # http://localhost:3000
```

You do **not** need a Google Cloud setup to develop the frontend — the committed `data/trip-data.sample.json` covers it. You only need real credentials to run `pnpm fetch-sheet` against a live sheet (see the [README](README.md) and [`doc/setup-sop.md`](doc/setup-sop.md)).

## Before opening a PR

Run the same checks CI runs — all must pass:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

The CI workflow (`.github/workflows/ci.yml`) runs these on every PR **without secrets**, using sample data, plus a sensitive-field guard on the build output.

## Tests

- Pure parsing / validation / sensitive-field logic lives in [`lib/parse-sheet.ts`](lib/parse-sheet.ts) and is unit-tested in `lib/parse-sheet.test.ts` (Vitest).
- If you change how the sheet is parsed, **add or update tests** — especially for schema-drift detection and sensitive-field filtering.
- `pnpm test:watch` for a watch loop, `pnpm test:coverage` for coverage.

## Commit & PR conventions

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `test:`.
- Keep PRs focused; fill in the PR template checklist.
- Reference related issues (`Closes #123`).

## Project layout

See the "Project Structure" section of the [README](README.md#project-structure). The one boundary worth knowing: **`lib/parse-sheet.ts` is the single data boundary** — all validation and filtering happen there; the rest of the app trusts `trip-data.json`.
