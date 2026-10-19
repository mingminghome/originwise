# Deploy OriginWise

**Default for this project:** develop and deploy **from your machine** with Wrangler.  
CI deploy is optional and off by default.

---

## Never commit secrets

| File | Commit? |
|------|---------|
| `.dev.vars` | **No** (gitignored) — local Function secrets |
| `.env` / `.env.local` | **No** (gitignored) — Vite build env e.g. GTM |
| `.dev.vars.example` / `.env.example` | **Yes** — placeholders only |
| `docs/`, source | **Yes** — no real keys or account IDs |

If a key was ever pasted into chat, a PR, or git history, **rotate it**.

---

## Local full stack (dev)

```bash
npm install
cp .dev.vars.example .dev.vars   # add at least one AI provider key
cp .env.example .env             # optional: VITE_GTM_ID, VITE_BUY_ME_A_PINT_URL

npm run pages:dev
# http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — `/api/check` is a stub |
| `npm run pages:dev` | Build + Wrangler Pages Functions + `.dev.vars` |
| `npm run build` | Production `dist/` |

---

## Local → Cloudflare Pages (recommended)

### 1. One-time login

```bash
npx wrangler login
```

### 2. Create / use a Pages project

```bash
# First deploy creates project if it does not exist
npm run deploy
# equivalent: npm run build && npx wrangler pages deploy dist --project-name=originwise
```

Change the project name in `package.json` script or:

```bash
npx wrangler pages deploy dist --project-name=YOUR_PROJECT_NAME
```

### App shell (for support / QA)

After deploy, smoke the SPA navigation:

| Area | Expected |
|------|----------|
| Top bar | Brand (Check) · **History** · **About** · **Settings** (+ optional pint chip) |
| About | Top-level; link to **How it works** |
| Settings | Preferences & delete data only |

### 3. Production secrets (Functions)

Set **encrypted** secrets on the Pages project (dashboard or CLI).  
**Do not** put real keys in the repo.

**Dashboard:** Cloudflare → Workers & Pages → your project → Settings → Environment variables  
(mark AI keys as **Encrypted** / Secrets)

**CLI examples** (values prompted; not stored in shell history if careful):

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name=originwise
# optional:
# npx wrangler pages secret put OPENAI_API_KEY --project-name=originwise
# npx wrangler pages secret put XAI_API_KEY --project-name=originwise
# npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=originwise
# optional web-search fallbacks (used only when Gemini Search fails or finds nothing):
# npx wrangler pages secret put BRAVE_SEARCH_API_KEY --project-name=originwise
# npx wrangler pages secret put FIRECRAWL_API_KEY --project-name=originwise
```

### 4. Build-time env (GTM, optional)

Cloudflare Pages → Settings → Environment variables → **Build**:

| Variable | Notes |
|----------|--------|
| `VITE_GTM_ID` | Optional. e.g. `GTM-XXXXXXX`. Empty = no GTM. |
| `VITE_GOOGLE_SITE_VERIFICATION` | Optional Search Console meta `content` token. Empty = no meta tag. |
| `VITE_BUY_ME_A_PINT_URL` | Optional support link. Empty = hide “Buy me a pint”. |
| `VITE_BUY_ME_A_PINT_IMG` | Optional button image URL. BMC profile URLs get a default image. |

For **local deploy**, these are baked in at `npm run build` from your local `.env` (if set).  
If you deploy without them, production has no GTM / no pint button until you rebuild with the vars.

### 4b. Map OriginWise dataLayer events in GTM → GA4

The SPA never changes the URL. GTM/GA Enhanced Measurement therefore only sees `/` unless you map the app’s `dataLayer` events.

**Turn off automatic page views** on the GA4 Configuration tag (`send_page_view` = false). Otherwise the first Check screen is counted twice.

**Data Layer variables** (Data Layer Version 2):

| Variable name | Data Layer Variable Name |
|---|---|
| DL - page_path | `page_path` |
| DL - page_title | `page_title` |
| DL - page_location | `page_location` |
| DL - input_type | `input_type` |
| DL - relation_tier | `relation_tier` |
| DL - has_photo | `has_photo` |
| DL - cached | `cached` |
| DL - force_refresh | `force_refresh` |
| DL - error_code | `error_code` |
| DL - placement | `placement` |

**Triggers** — Custom Event, fire on all Custom Events matching:

| Trigger | Event name |
|---|---|
| CE - virtual_page_view | `virtual_page_view` |
| CE - disclaimer_accept | `disclaimer_accept` |
| CE - check_start | `check_start` |
| CE - check_complete | `check_complete` |
| CE - check_error | `check_error` |
| CE - history_open_result | `history_open_result` |
| CE - support_click | `support_click` |

**Tags**

1. **GA4 Event — page_view** (this is what fills Pages and screens)
   - Event name: `page_view`
   - Trigger: CE - virtual_page_view
   - Event parameters:
     - `page_path` → {{DL - page_path}}
     - `page_title` → {{DL - page_title}}
     - `page_location` → {{DL - page_location}}

2. **GA4 Event** tags (one per action, or one tag with Event name = {{Event}})
   - `disclaimer_accept` — no extra params
   - `check_start` — `input_type`, `force_refresh`
   - `check_complete` — `relation_tier`, `has_photo`, `cached`, `force_refresh`
   - `check_error` — `error_code`, `input_type`
   - `history_open_result` — `relation_tier`, `has_photo`
   - `support_click` — `placement`

**Preview:** GTM Preview on the live site, switch tabs, run a check. You should see `virtual_page_view` then `check_start` / `check_complete`. Query text and photos must not appear in the dataLayer.

In GA4, mark `check_complete` as a conversion if you want a primary success metric.

### 5. Function config (non-secret)

| Variable | Notes |
|----------|--------|
| `WEB_LOOKUP` | `auto` (default) / `on` / `off`. Live web research via Gemini Google Search when `GEMINI_API_KEY` is set. |
| `GEMINI_WEB_MODEL` | Optional pin for grounded web search only. A real id is used alone. Unset or `auto` lists chat models for this key and tries the first few. If that list fails, the fallback is `gemini-flash-lite-latest`. Independent of `GEMINI_MODEL`. |
| `SEARCH_PROVIDERS` | Default `gemini,brave,firecrawl`. The next provider runs until two fetched pages have text longer than 80 characters. Providers without a key are skipped. |
| `WEB_SEARCH_MAX_ATTEMPTS` | Default `5` (max `8`). Gemini Search models tried per check. |
| `CHECK_ALLOWED_ORIGINS` | Comma-separated extra origins for custom domains |
| `CHECK_RATE_SHORT_LIMIT` | Default `1` (checks per short window) |
| `CHECK_RATE_SHORT_WINDOW_SEC` | Default `30` (seconds) |
| `CHECK_RATE_LONG_LIMIT` | Default `10` (checks per long window) |
| `CHECK_RATE_LONG_WINDOW_SEC` | Default `21600` (6 hours) |
| `CHECK_CACHE_TTL_SEC` | Default `86400`; capped at `604800` (7 days). Text-only checks only. |
| `POOL_DISABLE_PROVIDERS` | Optional, e.g. `openai,grok,claude` to force Gemini-only |
| `LOG_IP_SALT` | Optional log hashing salt |
| `*_MODEL` | `auto` (ask that provider’s models endpoint, try up to four chat ids) or a pin, which is used alone. If the list call fails, one fallback is used: `gemini-flash-lite-latest`, `gpt-4.1-mini`, `grok-4`, `claude-haiku-4-5` |

At least **one** AI provider secret is required for live checks.

### Free-tier reality (why “3 failed · Gemini OK” happens)

Having an API **key** is not the same as free **quota**. With `*_MODEL=auto`, OriginWise asks that provider’s models endpoint and tries the chat ids it returns. A quota or upstream error moves the same step to the next configured provider.

| Provider | Ongoing free API? | What you must do |
|----------|-------------------|------------------|
| **Gemini** | Yes (Flash / Flash-Lite rate limits) | Key in AI Studio — most reliable free path for **text** agents. **Web row** needs **Search grounding**, which is a *separate* quota line in AI Studio (Tools → Search grounding). |
| **Gemini Search (web)** | Separate Search grounding quota in AI Studio | OriginWise uses the first chat ids from this key’s models list. It does not rank a named family. Pin one id with `GEMINI_WEB_MODEL` if you need a specific model. |
| **OpenAI** | **Free tier** usage tier (auto-upgrades after paid credit purchases) | Check **Settings → Limits**. Free orgs often have **~50 RPD** and per-model TPM/RPM. Prefer **mini** models (`gpt-5.4-mini`, `gpt-5.6-luna`) — higher TPM than flagship (`gpt-5.5` is only ~3 RPM). `upstream_quota` = hit RPM/RPD/TPD or no remaining Free access |
| **Anthropic** | No ongoing free tier (one-time trial credits) | Trial spent → `upstream_quota`; add credits or remove secret |
| **xAI Grok** | Trial / credit program, not unlimited free | Console credits required; empty balance → `upstream_error` |

**OpenAI Free tier tip:** With `OPENAI_MODEL` unset, OriginWise uses the chat ids that key’s models list returns. Pin with `OPENAI_MODEL=…` to use one id only. Hitting the daily request cap on Free means those models stop until the window resets.

**402 “credits used up” on Gemini:** if the Gemini project has billing on with a **£0 prepaid balance**, every model returns 402 and OriginWise shows the credits notice. Top up the balance, or turn billing off for that project to go back to the free tier.

**Local `.dev.vars` does not update Cloudflare.** Production secrets live in Pages → Settings. If you comment out keys locally, production still uses old secrets until you change them.

To run **Gemini-only** in production (recommended when free OpenAI/Claude/Grok are empty):

```bash
# Option A — env var (dashboard or wrangler pages secret / project setting)
POOL_DISABLE_PROVIDERS=openai,grok,claude

# Option B — delete unused secrets from Pages so they are not assigned
```

---

## GitHub

CI workflow (`.github/workflows/deploy-cloudflare-pages.yml`) is **manual only**  
(`workflow_dispatch`) so a push does not auto-deploy until you opt in.

To enable optional CI deploy later: add Actions secrets  
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, then run the workflow from the Actions tab.

---

## Custom domain

Pages → Custom domains, then set:

```text
CHECK_ALLOWED_ORIGINS=https://your.domain
```

---

## Privacy

History stays in the browser. Photos are not stored as server records.  
See `SECURITY.md`, `public/privacy.html`.
