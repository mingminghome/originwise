# OriginWise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Local-first **China-related product / brand / origin checker**: place of origin, manufacturer, company relations, and optional alternatives.

**Live demo:** [https://originwise.pages.dev](https://originwise.pages.dev)  
**License:** [MIT](./LICENSE) · **Security:** [SECURITY.md](./SECURITY.md)

**Production path:** static SPA on **Cloudflare Pages** + stateless **Pages Function** AI check (`/api/check`).  
History and settings stay in the browser — **not stored as a server-side product database**.

```
Browser  →  Pages (SPA)  →  localStorage (history, settings)
         →  POST /api/check  (SSE or JSON)
              → multi-agent pool | dual | monolith
              → pure-TS relation tiers synthesize
```

---

## Live demo

**Try it:** [https://originwise.pages.dev](https://originwise.pages.dev)

Useful for:

| Area | What you get |
|------|----------------|
| **Text or photo check** | Product / brand name and optional packaging image (client compress) |
| **Relation tiers** | Origin, manufacturer, and company-link style badges (pure-TS synthesize) |
| **Multi-agent AI** | Free-tier pool (Gemini / OpenAI / Grok / Claude) with SSE progress |
| **Graph & alternatives** | Visual links plus optional alternative suggestions |
| **History** | Local history + settings; wipe on device anytime |
| **Privacy** | No account; diary of checks stays on-device |

Taiwan is always treated as a **separate country** (not China-related for tiers). AI results can be wrong — verify critical decisions yourself. Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html).

---

## Features

- **Text and/or packaging photo** — client-side compress before upload  
- **Multi-agent pipeline** — free-tier AI pool (Gemini / OpenAI / Grok / Claude)  
- **SSE progress UI** — relation tier badges, region chips, graph, alternatives  
- **History + settings** — delete local data anytime  
- **Taiwan policy** — always a separate country for tiering  
- **i18n** — English + Traditional Chinese  
- **Optional GTM** — via `VITE_GTM_ID` only (never hardcoded)  
- **Optional “Buy me a pint”** — via `VITE_BUY_ME_A_PINT_URL` only (never hardcoded)   
- **Providers** — server keys only; users never paste API keys in the UI  

---

## Quick start

```bash
npm install
cp .env.example .env                 # optional e.g. VITE_GTM_ID, VITE_BUY_ME_A_PINT_URL
cp .dev.vars.example .dev.vars
# put at least one of: GEMINI_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY

npm run pages:dev                    # full SPA + /api/check (recommended)
# open http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — Check API is a **stub** (provider not configured) |
| `npm run pages:dev` | Build + Wrangler Pages with real Functions + secrets |
| `npm run build` | Typecheck + production `dist/` |
| `npm test` | Unit tests |
| `npm run lint` | Oxlint (if configured) |

### Secrets (never commit)

| File | Commit? |
|------|---------|
| `.dev.vars` | **Never** — AI keys for local `pages:dev` |
| `.env` / `.env.local` | **Never** — e.g. `VITE_GTM_ID`, `VITE_BUY_ME_A_PINT_URL` |
| `*.example` | Yes — empty placeholders only |

For self-hosting (Cloudflare Pages, env keys, CI), see [docs/DEPLOY.md](./docs/DEPLOY.md).

---

## Privacy & security (summary)

- No accounts, no server-side product catalogue of user checks.  
- `/api/check` proxies analysis to the AI provider; rate-limit / origin checks apply where configured.  
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
