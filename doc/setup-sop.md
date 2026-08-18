# Setup SOP — Google Cloud & API Keys

Detailed, one-time setup for wiring the site to your Google Sheet and Google Maps. Referenced from the project [README](../README.md). Total time: ~20 minutes.

You will produce these values, which become GitHub Secrets in the README's "Add GitHub Secrets" step:

| Value                    | Where it comes from | Secret name                   |
| ------------------------ | ------------------- | ----------------------------- |
| WIF provider resource name | Part F            | `GCP_WORKLOAD_IDENTITY_PROVIDER` |
| Service-account email    | Part B              | `GCP_SERVICE_ACCOUNT`         |
| Spreadsheet ID           | Part C              | `SHEET_ID`                    |
| Maps Embed API key       | Part D              | `NEXT_PUBLIC_GMAPS_EMBED_KEY` |
| Spreadsheet share URL    | Part C              | `NEXT_PUBLIC_SHEETS_URL`      |

Parts A–D and F are required. **Part E is only needed for the 推薦 (store suggestions) tab**,
and is the only part that involves billable APIs.

> No long-lived credential appears anywhere in this document. CI authenticates through
> Workload Identity Federation (Part F); the only key you create is the public Embed key.

---

## Part A — GCP project & Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `japan-trip-site`).
2. **APIs & Services → Library** → search **Google Sheets API** → **Enable**. (Read-only use; Drive API is **not** needed.)
3. **APIs & Services → Library** → search **Maps Embed API** → **Enable**. (Free, no usage billing — see Part D for the key.)

## Part B — Service account (no key)

1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Give it a name (e.g. `trip-sheet-reader`). **Leave all roles empty** — sheet access is granted in Part C, and the one IAM role it needs for the 推薦 tab is added in Part E.
3. **Do not create a key.** Skip the Keys tab entirely.

> Step 3 is the point of this setup, not an omission. GitHub Actions authenticates by
> federating its own identity (Part F), so a downloadable private key would be a
> permanent credential that buys nothing. A key that does not exist cannot be committed,
> leaked, or forgotten in a rotation schedule.

Note the service account's email address — it looks like `trip-sheet-reader@<project>.iam.gserviceaccount.com`. It becomes the `GCP_SERVICE_ACCOUNT` secret.

## Part C — Share the spreadsheet & collect IDs

1. Import `doc/sheet.xlsx` into Google Sheets (Google Drive → New → File upload → open with Google Sheets, or Sheets → File → Import), then edit your trip data in it.
2. Click **Share**, paste the service-account email from Part B, set role to **Viewer** (least privilege), and share.
3. From the spreadsheet URL, collect two values:
   - **`SHEET_ID`** — the ID between `/d/` and `/edit`:
     ```
     https://docs.google.com/spreadsheets/d/<THIS_IS_SHEET_ID>/edit#gid=0
     ```
   - **`NEXT_PUBLIC_SHEETS_URL`** — the full share/edit URL. This is a public value used only for the site's "open Google Sheets" convenience links (empty-state and footer). Use a link whose sharing level you are comfortable exposing.

## Part D — Maps Embed API key

The overview map uses the **Maps Embed API** (a pure `<iframe>`), chosen because it is free with no usage cap and needs no runtime JS SDK — fully compatible with the static export.

1. **APIs & Services → Credentials → Create credentials → API key**. Copy the generated key → this is `NEXT_PUBLIC_GMAPS_EMBED_KEY`.
2. Click **Edit API key** and restrict it (the key ships in public HTML, so restriction is the real protection):
   - **Application restrictions → HTTP referrers (web sites)**. Add your Pages domain, e.g.:
     ```
     https://<user>.github.io/*
     ```
     For local development also add:
     ```
     http://localhost:3000/*
     ```
   - **API restrictions → Restrict key** → select **Maps Embed API** only.
3. Save.

> The Embed API key is a public value by design; the HTTP-referrer restriction is what prevents it being reused on other domains.

## Part E — Billable APIs & cost controls (推薦 tab only)

Skip this whole part if you don't use the 推薦 tab. It enables the two APIs that
`pnpm fetch-stores` uses at build time to resolve saved-list entries into coordinates.

**Unlike the Embed API, these two are billable.** Read E3 before enabling them.

Every console link below takes `?project=<PROJECT_ID>` — substitute the project you
created in Part A, or pick it from the project switcher once you land on the page.

| Page                      | URL                                                        |
| ------------------------- | ---------------------------------------------------------- |
| Maps Platform → APIs      | `console.cloud.google.com/google/maps-apis/api-list`       |
| Maps Platform → Credentials | `console.cloud.google.com/google/maps-apis/credentials`   |
| Maps Platform → Quotas    | `console.cloud.google.com/google/maps-apis/quotas`         |
| Maps Platform → Metrics   | `console.cloud.google.com/google/maps-apis/metrics`        |
| Billing → Budgets & alerts | `console.cloud.google.com/billing/budgets`                |
| Billing → Reports         | `console.cloud.google.com/billing/reports`                 |

### E1 — Enable the APIs and authorise the service account

1. Open **Maps Platform → APIs**. Find **Places API (New)** and **Geocoding API**, and
   **Enable** each. Enabling requires billing on the project; usage stays inside the free
   tier so the real bill is $0, but the card must be on file for the APIs to answer.
   - Take care to enable **Places API (New)**, not the legacy "Places API". The script
     calls `places.googleapis.com/v1/places:searchText`, which only the new one serves.
2. **No API key is needed.** Both APIs are called with the federated OAuth token from
   Part F, so there is nothing to create, restrict, or rotate here.
3. Grant the service account permission to consume these APIs:
   ```bash
   gcloud projects add-iam-policy-binding <PROJECT_ID> \
     --member="serviceAccount:<SA_EMAIL>" \
     --role="roles/serviceusage.serviceUsageConsumer"
   ```
   If a Places or Geocoding call later returns 403, this binding is the first thing to
   check — the token is valid but the identity lacks permission to spend the project's
   quota.

### E2 — Set daily quota caps (the only hard stop)

Open **Maps Platform → Quotas** and pick the API from the selector at the top of the page.
Find the **Requests per day** row, open the **⋮** menu at the right → **Edit quota** →
untick **Unlimited** → enter the value → **Save** (raising a quota can require review;
lowering one applies immediately).

Repeat for both APIs. Note the counter resets at **midnight US Pacific time**, not local
time — worth remembering when you are reading a partially-used day.

| API              | Quota row                          | Daily cap | Why                                                                                 |
| ---------------- | ---------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| Places API (New) | `SearchTextRequest per day`        | **400**   | Must exceed one full re-query of the whole store list (~200), with room for a retry |
| Geocoding API    | `v4 GeocodeAddress requests per day` | **250** | One call per distinct day-area (~5). 250 × 31 stays under the 10,000 free tier      |

Set every **other** `per day` row on both APIs to **1**. Those methods are never called,
and leaving them uncapped would let a stray caller spend outside the two rows above —
including the pricier Enterprise-tier Places methods. Note this includes
`v3 requests per day` on Geocoding: the script moved to v4, so v3 is now an unused path
and should be capped like the rest.

Leave every `per minute` and `per minute per user` row alone. Those are throughput
limits, not cost limits, and lowering the ones the script actually uses would throttle
or break the build. Quotas are evaluated together — the strictest one wins — so an
unlimited per-minute row opens no hole once the per-day row is set.

**The Places cap must always stay above the store-list size.** `fetch-stores` calls the
API once per store that isn't already cached, and it writes the cache only after every
store resolves. If the cap is hit mid-run the build fails *and* the cache is never
written, so the next run starts over and fails again — a loop that only ends by raising
the cap. Re-check this number whenever the list grows; the rule of thumb is
`cap ≥ 2 × store count`.

The deploy guards against exactly that: a **Preflight store lookup usage** step runs
`pnpm fetch-stores:check` before the real fetch. It reads the sheet and the cache, reports
how many calls this run intends to make (in the job summary, not just the log), and aborts
if that exceeds `MAX_PLACE_CALLS` — set alongside the GCP quota in `deploy.yml`, default
400. The preflight itself calls no billable API, so aborting there costs nothing. Keep
`MAX_PLACE_CALLS` at or below the GCP daily cap, so you stop yourself before Google does.

You can run the same check locally at any time:

```bash
pnpm fetch-stores:check   # prints the planned call count, spends nothing
```

### E3 — Budget alert, and what it does not do

Open **Billing → Budgets & alerts → Create budget**, then work through the four sections:

1. **Scope** — set **Projects** to this project only, so an alert can only mean this
   pipeline. Leave services unfiltered.
2. **Amount** — **Specified amount**, **1**. Enter it in whatever currency your billing
   account uses; if the account is in TWD the field is TWD, so enter `30`, not `1`.
3. **Actions** — keep the default percentage thresholds and tick **Email alerts to billing
   admins and users** so it reaches you without extra wiring.
4. **Finish**.

Two things worth being precise about:

- **A budget alert only sends email. It does not stop requests or cap spending.** Treat
  it as a smoke detector: expected spend is $0, so any alert means the lookup cache has
  stopped working.
- **Spend cap budgets — which do pause a service — are not available for Google Maps
  Platform.** They cover only a short list of services (Gemini, Cloud Run, and similar).
  This is why E2 is the real control and not optional.

### E4 — Where to see the bill

- **Billing → Reports** — opens on the current calendar month, daily cost grouped by
  service. Filter **Service** to `Places API` / `Geocoding API`, or group by **SKU** to
  see `Places API Text Search Pro` on its own.
- **Billing → Cost table** — invoice-level detail once a month closes.
- **Google Maps Platform → Metrics** — request counts rather than cost; the fastest way
  to confirm the cache is working, because a healthy month shows near-zero Places calls.
- **Google Maps Platform → Quotas** — current usage against the caps set in E2.

## Part F — Workload Identity Federation

This is what replaces the service-account key. GitHub Actions presents its own OIDC
identity, GCP exchanges it for a token that expires in about an hour, and the exchange
is accepted **only** for this repository.

Run these once with `gcloud` (substitute your project and repo):

1. Create the pool and an OIDC provider:
   ```bash
   gcloud iam workload-identity-pools create "github" \
     --project="<PROJECT_ID>" --location="global"

   gcloud iam workload-identity-pools providers create-oidc "trip-sheets" \
     --project="<PROJECT_ID>" --location="global" \
     --workload-identity-pool="github" \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository == '<OWNER>/<REPO>'"
   ```

   > `--attribute-condition` is the line that matters. Without it **any** GitHub
   > repository on the internet can mint tokens for your service account.

2. Let that repository impersonate the service account from Part B:
   ```bash
   gcloud iam service-accounts add-iam-policy-binding "<SA_EMAIL>" \
     --project="<PROJECT_ID>" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/attribute.repository/<OWNER>/<REPO>"
   ```

3. Add two GitHub Actions secrets (repo → Settings → Secrets and variables → Actions):

   | Secret | Value |
   | --- | --- |
   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/trip-sheets` |
   | `GCP_SERVICE_ACCOUNT` | the service-account email from Part B |

   Neither value is a credential — without a matching OIDC identity they grant nothing.
   They live in secrets rather than the workflow file simply because this repo is public
   and there is no reason to publish the project number and service-account address.

4. Confirm it works **before** merging anything: Actions → **Auth check** → Run workflow,
   from any branch, with `mode: check`. It authenticates, reads the sheet, and prints the
   projected API usage. It never deploys and makes no billable call.

---

## Verify

There are no credentials on your machine, by design — so local checks cover only the
offline path, and anything touching Google runs in CI.

Locally:

```bash
pnpm fetch-sheet:sample     # committed sample data
pnpm fetch-stores:sample
pnpm dev                    # the whole site works offline on sample data
```

In CI — Actions → **Auth check** → Run workflow:

| mode | What it proves | Billable calls |
| --- | --- | --- |
| `check` | Federation works and the sheet is readable | none |
| `full` | The OAuth token is accepted by Places and Geocoding | first run only |

Run `full` **twice**. The first run reports one API call per store; the second should
report `0 次 Places`. That drop is the lookup cache doing its job, and it is the single
most important thing to confirm — every cost estimate in Part E assumes it.

Once both modes are green, the deploy will work. Nothing else needs a key.
