# Security Policy

## Reporting a vulnerability

**Please do not open public issues for security problems.**

Report privately via GitHub's [Security Advisories](https://github.com/KevinShih-689/trip-sheets/security/advisories/new). Include:

- what the issue is and where (file / workflow / URL),
- steps to reproduce or a proof of concept,
- the impact you foresee.

You'll get an acknowledgement as soon as possible, and a fix or mitigation plan once the report is triaged.

## Scope & threat model

This project is a **public static site** built from a private Google Sheet. Its security posture rests on a few deliberate guarantees:

### 1. Sensitive fields never reach the static output (spec §3.2)

`訂位代號 (PNR)` (flight booking reference) and `訂單編號` (room booking number) are **dropped at the parse layer** — the return types in [`lib/parse-sheet.ts`](lib/parse-sheet.ts) simply have no such field, so they cannot leak into `data/trip-data.json`, the built HTML, or JS bundles.

This is enforced in three ways:

- **Type level** — `parseFlight` / `parseRoom` don't map those columns.
- **Tests** — `lib/parse-sheet.test.ts` asserts the values never appear in the parsed output.
- **CI guard** — both `ci.yml` and `deploy.yml` `grep` the build output for `訂位代號 | PNR | 訂單編號` and fail the job on any hit.

If you add or change Backlog parsing, keep all three in place.

### 2. Credentials

- The Google **service account** has **Viewer** access to a single spreadsheet and **no GCP/IAM roles** — least privilege.
- **The service account has no key.** CI authenticates through Workload Identity Federation: GitHub's OIDC identity is exchanged for a token that expires in about an hour, and GCP only accepts that exchange from this repository. There is no long-lived Google credential in GitHub Secrets, on any laptop, or in the repo — so there is nothing to rotate and nothing to leak. `.gitignore` still blocks `*service-account*.json`, `*sa-key*.json`, and `.env*` in case one is ever created by mistake.
- The same federated token authorises the Places and Geocoding calls, so the build-time Maps API key is gone too. Daily quota caps on both APIs remain the cost control — federation limits who can call, not how much.
- `deploy.yml` (which reads secrets) only runs on `main` / `workflow_dispatch` / `cron`. `ci.yml` runs on PRs **without secrets**, using committed sample data — so fork PRs can never exfiltrate secrets.

### 3. Public-by-design values

- `NEXT_PUBLIC_GMAPS_EMBED_KEY` is embedded in public HTML by design. It **must** be restricted by **HTTP referrer** (your Pages domain) and to the **Maps Embed API** only. See [`doc/setup-sop.md`](doc/setup-sop.md).
- `NEXT_PUBLIC_SHEETS_URL` is a link shown in the UI. Use a sharing level you're comfortable exposing publicly.

## If a secret is exposed

1. **Rotate immediately**: delete the leaked service-account key (or API key) in Google Cloud Console and create a new one.
2. Update the corresponding GitHub Secret.
3. If a real PNR / booking number reached the public site, treat it as compromised and re-issue where possible.

## Supported versions

This is a personal-use template; only the latest `main` is maintained.
