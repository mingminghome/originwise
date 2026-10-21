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
              → identity JSON (brand, product, model — no country)
              → we fetch pages (Gemini, then Brave, then Firecrawl)
              → tidy JSON written from those pages
              → a claim stays only when its quote is on a fetched page
              → score JSON (0–100, Made in card, Link to China card)
```

---

## Live demo

**Try it:** [https://originwise.pages.dev](https://originwise.pages.dev)

Useful for:

| Area | What you get |
|------|----------------|
| **Text or photo check** | Product / brand name and optional packaging image (camera, gallery, drop, or paste) |
| **China link** | The score step writes 0–100 and the Link to China card from facts that survived the quote check. The page shows that score above the Made in and Link to China cards |
| **Check steps** | Provider pool (Gemini / OpenAI / Grok / Claude). Identity, tidy, and score are separate JSON calls; SSE shows progress |
| **Live web search** | Google Search via Gemini, then Brave and Firecrawl. The server fetches the pages. It does not name the country |
| **Result cards** | The page prints the score JSON. A made-in is confirmed only from exact-model pages. A continent is not a country. Country names are in the reader's language |
| **Graph & alternatives** | Visual links plus optional alternative suggestions |
| **History** | Local history + settings; wipe on device anytime |
| **Privacy** | No account; check history stays on-device |

Taiwan is always treated as a **separate country** for relation tiers. AI results can be wrong — verify critical decisions yourself. Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html).

---

## Features

- **Text and/or packaging photo** — camera, gallery, drag-and-drop, or paste; client-side compress before upload
- **Check steps** — AI pool (Gemini / OpenAI / Grok / Claude). Identity names the product. Tidy writes claims from the pages we fetched. Score writes the cards.
- **China link** — 0–100 is how strongly the surviving facts connect this product to China. A China page, part, or stated factory or OEM keeps the score off 0 and the company headline off Unrelated. Headquarters, brand origin, and a design country are not the made-in. A sales or retail presence does not raise the score. Taiwan is never China. Hong Kong and Macau count only when the geo scope is Greater China
- **Live web search** — Gemini Google Search first; Brave and Firecrawl follow while fewer than two fetched pages have real text (`SEARCH_PROVIDERS`). Providers with no key are skipped. The query marks model and size tokens with `+`, joins origin words with `OR`, and appends `-youtube.com`. Brave and Firecrawl run one wider follow-up when the first batch has only one usable page. The server fetches up to 4 pages and passes their text on. It does not decide the country
- **What the page shows** — see [How the result is written](#how-the-result-is-written)
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

## How the result is written

| Step | What it does |
|------|----------------|
| **Identity** | Reads the user text into brand, product, and model. It does not name a country |
| **Fetch** | We choose the links and download the pages |
| **Tidy** | Writes claims and a short quote for each one, using only those pages |
| **Quote check** | Drops a made-in, part, relation, or design line unless that quote is on a page we fetched. Headquarters stays only when that place is on a page |
| **Score** | Writes the summary, the 0–100 score, and the two cards. The page prints that JSON |

| Headline | When |
|----------|------|
| **Country name** | Two exact-model pages on different sites name that country, or the model's country matches one such page, and no page names another place. The server sets this mark |
| **Mostly {Country}** | Parts lead to one country. This is not the finished unit, and it is not a confirmation |
| **Unconfirmed** | Pages name different places, a page only names a region such as Europe, or one page does not match the model's country |

One retailer page is a source. A user review is not a made-in source. Design or brand wording is never the made-in. A factory or OEM line appears only when a page or the company record names a real plant. Country names are written in the reader's language.

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
- With live web search on, the product name goes to the search service (Google via Gemini, then Brave / Firecrawl while the page set is still thin). A barcode in the text can be part of that query. Photos are never sent to search. Fetched page text is sent to the tidy step.
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
