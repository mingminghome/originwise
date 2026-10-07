# OriginWise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Product origin checker**: place of origin, manufacturer, company relations, and optional alternatives.

**Live demo:** [https://originwise.pages.dev](https://originwise.pages.dev)  
**License:** [MIT](./LICENSE) · **Security:** [SECURITY.md](./SECURITY.md)

**Production path:** static SPA on **Cloudflare Pages** + stateless **Pages Function** (`/api/check`).  
History and settings stay in the browser — **not stored as a server-side product database**.

```
Browser  →  Pages (SPA)  →  localStorage (history, settings)
         →  POST /api/check  (SSE or JSON)
              → multi-agent pool | dual | monolith
              → pure-TS relation tiers
```

---

## Live demo

**Try it:** [https://originwise.pages.dev](https://originwise.pages.dev)

Useful for:

| Area | What you get |
|------|----------------|
| **Text or photo check** | Product / brand name and optional packaging image (camera, gallery, drop, or paste) |
| **Relation tiers** | Origin, manufacturer, and company-link style badges (pure-TS synthesize) |
| **Multi-agent AI** | Provider pool (Gemini / OpenAI / Grok / Claude) with SSE progress |
| **Live web search** | Google Search via Gemini, with Brave and Firecrawl as fallbacks; reads made-in lines and barcodes from result pages |
| **Evidence labels** | Each made-in says how it was matched: barcode, product name, or unconfirmed |
| **Graph & alternatives** | Visual links plus optional alternative suggestions |
| **History** | Local history + settings; wipe on device anytime |
| **Privacy** | No account; check history stays on-device |

Taiwan is always treated as a **separate country** for relation tiers. AI results can be wrong — verify critical decisions yourself. Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html).

---

## Features

- **Text and/or packaging photo** — camera, gallery, drag-and-drop, or paste; client-side compress before upload
- **Multi-agent pipeline** — AI pool (Gemini / OpenAI / Grok / Claude)
- **Live web search** — Gemini Google Search first; Brave Search and Firecrawl run only if the previous provider fails or finds nothing (`SEARCH_PROVIDERS`). The server fetches up to 4 result pages to read the made-in line and barcode.
- **Evidence rules** — see [How a made-in is confirmed](#how-a-made-in-is-confirmed)
- **Clear service notices** — if search or AI quota (429) or prepaid credits (402) run out, the result says so and falls back to model knowledge instead of guessing
- **SSE progress UI** — relation tier badges, region chips, graph, alternatives
- **History + settings** — delete local data anytime
- **Taiwan policy** — always a separate country for tiering
- **i18n** — English, Traditional Chinese, and major EU languages (CS, DA, DE, EL, ES, FI, FR, HU, IT, NL, PL, PT, RO, SV)
- **Optional GTM** — via `VITE_GTM_ID` only (never hardcoded)
- **Optional Search Console** — via `VITE_GOOGLE_SITE_VERIFICATION` (HTML meta; never hardcoded)
- **Optional “Buy me a pint”** — via `VITE_BUY_ME_A_PINT_URL` only (never hardcoded)
- **Providers** — server keys only; users never paste API keys in the UI
- **Navigation** — floating top bar: brand (Check) · History · About · Settings (+ optional pint chip)

---

## How a made-in is confirmed

| Result | When |
|--------|------|
| **Confirmed** (barcode match) | From a package label photo, or a web page showing the same barcode (JAN/EAN) next to the made-in line |
| **Likely** (name match) | A page matches the product name only, not the barcode |
| **Unconfirmed** | A page lists several sizes or variants, sources disagree, or only model knowledge is available; candidate countries are noted |

Model knowledge alone never counts as confirmed, and results without live search are labelled as model-only.

---

## Quick start

```bash
npm install
cp .env.example .env                 # optional e.g. VITE_GTM_ID, VITE_BUY_ME_A_PINT_URL
cp .dev.vars.example .dev.vars
# put at least one of: GEMINI_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY
# optional search fallbacks: BRAVE_SEARCH_API_KEY / FIRECRAWL_API_KEY

npm run pages:dev                    # full SPA + /api/check (recommended)
# open http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — Check API is a **stub** (provider not configured) |
| `npm run pages:dev` | Build + Wrangler Pages with real Functions + secrets |
| `npm run build` | Typecheck + production `dist/` |
| `npm run deploy` | Build + deploy to Cloudflare Pages (`originwise`) |
| `npm test` | Unit tests |
| `npm run lint` | Oxlint (if configured) |

### Secrets (never commit)

| File | Commit? |
|------|---------|
| `.dev.vars` | **Never** — AI and search keys for local `pages:dev` |
| `.env` / `.env.local` | **Never** — e.g. `VITE_GTM_ID`, `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_BUY_ME_A_PINT_URL` |
| `*.example` | Yes — empty placeholders only |

For self-hosting (Cloudflare Pages, env keys, CI), see [docs/DEPLOY.md](./docs/DEPLOY.md).

---

## Privacy & security (summary)

- No accounts, no server-side product catalogue of user checks.
- `/api/check` proxies analysis to the AI provider; rate-limit / origin checks apply where configured.
- With live web search on, the product name and barcode go to the search service (Google via Gemini, then Brave / Firecrawl if needed). Photos are never sent to search.
- Text-only results may be cached at the edge for up to 7 days under a hash of the query (not tied to a person); photo checks are not cached. Logs keep a job ID, a daily-salted IP hash and the tier or error code, not the product name or photo.
- Photos are compressed client-side; not stored as server records.
- **Never commit** `.env` or `.dev.vars` (gitignored). Rotate keys if they leak.
- Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html)

---

## Disclaimer

OriginWise is an **independent research helper**, not legal, customs, or compliance advice. AI and tier labels can be incomplete or wrong. Always verify against official sources before purchase or policy decisions.

---

## Docs

| Doc | Topic |
|-----|--------|
| [docs/DESIGN.md](./docs/DESIGN.md) | Architecture |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Self-host / Cloudflare deploy notes |
| [SECURITY.md](./SECURITY.md) | Threat model & secrets |
| [privacy.html](./public/privacy.html) | Privacy |
| [terms.html](./public/terms.html) | Terms |

---

## License

[MIT](./LICENSE) © MingMingHomeWork
