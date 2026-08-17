# Setup SOP — Google Cloud & API Keys

Detailed, one-time setup for wiring the site to your Google Sheet and Google Maps. Referenced from the project [README](../README.md). Total time: ~20 minutes.

You will produce four values, which become GitHub Secrets in the README's "Add GitHub Secrets" step:

| Value                    | Where it comes from | Secret name                   |
| ------------------------ | ------------------- | ----------------------------- |
| Service-account JSON key | Part A              | `GOOGLE_SERVICE_ACCOUNT_KEY`  |
| Spreadsheet ID           | Part C              | `SHEET_ID`                    |
| Maps Embed API key       | Part D              | `NEXT_PUBLIC_GMAPS_EMBED_KEY` |
| Spreadsheet share URL    | Part C              | `NEXT_PUBLIC_SHEETS_URL`      |

---

## Part A — GCP project & Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `japan-trip-site`).
2. **APIs & Services → Library** → search **Google Sheets API** → **Enable**. (Read-only use; Drive API is **not** needed.)
3. **APIs & Services → Library** → search **Maps Embed API** → **Enable**. (Free, no usage billing — see Part D for the key.)

## Part B — Service account & JSON key

1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Give it a name (e.g. `trip-sheet-reader`). **Leave all roles empty** — it needs no GCP/IAM permissions, only sheet-level access granted in Part C.
3. Open the created service account → **Keys → Add key → Create new key → JSON → Create**. A `.json` file downloads.
4. Keep this file **outside the repo**. Its entire contents become the `GOOGLE_SERVICE_ACCOUNT_KEY` secret.

> ⚠️ Never commit this key. `.gitignore` already blocks `*service-account*.json`, `*sa-key*.json`, and `.env*`, but treat the file as a password regardless.

Note the service account's email address — it looks like `trip-sheet-reader@<project>.iam.gserviceaccount.com`.

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

---

## Verify

Before pushing, confirm the service account can read the sheet locally:

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY="$(cat /path/to/your-sa-key.json)"
export SHEET_ID="your-sheet-id"
pnpm fetch-sheet   # should write data/trip-data.json with no errors
```

If this succeeds, add the four values as GitHub Secrets (README step 3) and deploy.
