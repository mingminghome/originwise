# Deploy OriginWise

**Default for this project:** develop and deploy **from your machine** with Wrangler.  
GitHub can stay **private** (source backup only). CI deploy is optional and off by default.

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
cp .env.example .env             # optional: VITE_GTM_ID=GTM-XXXXXXX

npm run pages:dev
# http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — `/api/check` is a stub |
| `npm run pages:dev` | Build + Wrangler Pages Functions + `.dev.vars` |
| `npm test` | Unit tests |
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
```

### 4. Build-time env (GTM, optional)

Cloudflare Pages → Settings → Environment variables → **Build**:

| Variable | Notes |
|----------|--------|
| `VITE_GTM_ID` | Optional. e.g. `GTM-XXXXXXX`. Empty = no GTM. |

For **local deploy**, GTM is baked in at `npm run build` from your local `.env` (if set).  
If you deploy without setting `VITE_GTM_ID` in `.env`, production has no GTM until you rebuild with it or use a CI build that has the var.

### 5. Function config (non-secret)

| Variable | Notes |
|----------|--------|
| `CHECK_MODE` | `multi` (default when keys exist) \| `dual` \| `monolith` |
| `CHECK_ALLOWED_ORIGINS` | Comma-separated extra origins for custom domains |
| `CHECK_RATE_SHORT_LIMIT` | Default `1` (checks per short window) |
| `CHECK_RATE_SHORT_WINDOW_SEC` | Default `30` (seconds) |
| `CHECK_RATE_LONG_LIMIT` | Default `10` (checks per long window) |
| `CHECK_RATE_LONG_WINDOW_SEC` | Default `21600` (6 hours) |
| `CHECK_CACHE_TTL_SEC` | Default `86400` |
| `POOL_DISABLE_PROVIDERS` | Optional, e.g. `openai,grok,claude` to force Gemini-only |
| `LOG_IP_SALT` | Optional log hashing salt |
| `*_MODEL` | `auto` (default free-tier chain + fallback) or pin an id e.g. `gpt-4.1-mini`, `grok-4.5`, `claude-haiku-4-5` |

At least **one** AI provider secret is required for live checks.

### Free-tier reality (why “3 failed · Gemini OK” happens)

Having an API **key** is not the same as free **quota**. OriginWise will try free-oriented models (`auto` chains), then **retry the same agent on the next provider** (usually Gemini) if a key returns quota/error.

| Provider | Ongoing free API? | What you must do |
|----------|-------------------|------------------|
| **Gemini** | Yes (Flash / Flash-Lite rate limits) | Key in AI Studio — most reliable free path |
| **OpenAI** | Only with **data-sharing opt-in** (mini/nano ~10M tok/day) | Console → enable data sharing; unpaid accounts without opt-in get `upstream_quota` |
| **Anthropic** | No ongoing free tier (one-time trial credits) | Trial spent → `upstream_quota`; add credits or remove secret |
| **xAI Grok** | Trial / credit program, not unlimited free | Console credits required; empty balance → `upstream_error` |

**Local `.dev.vars` does not update Cloudflare.** Production secrets live in Pages → Settings. If you comment out keys locally, production still uses old secrets until you change them.

To run **Gemini-only** in production (recommended when free OpenAI/Claude/Grok are empty):

```bash
# Option A — env var (dashboard or wrangler pages secret / project setting)
POOL_DISABLE_PROVIDERS=openai,grok,claude

# Option B — delete unused secrets from Pages so they are not assigned
# Option C — CHECK_MODE=monolith  (single Gemini full check)
```

---

## GitHub (private) — source only

```bash
# after git init + first commit (see README)
gh repo create cn-related-check --private --source=. --remote=origin --push
# or create empty private repo on GitHub, then:
# git remote add origin git@github.com:YOUR_USER/cn-related-check.git
# git push -u origin main
```

CI workflow (`.github/workflows/deploy-cloudflare-pages.yml`) is **manual only**  
(`workflow_dispatch`) so a private push does not auto-deploy until you opt in.

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
