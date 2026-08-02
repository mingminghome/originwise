# OriginWise

Local-first **China-related product / brand / origin checker**: place of origin, manufacturer, company relations, and optional alternatives.

**Stack:** React 19 + Vite + TypeScript on **Cloudflare Pages** (SPA + Pages Functions).

```
Browser  →  localStorage (history, settings)
         →  POST /api/check  (SSE or JSON)
              → multi-agent pool | dual | monolith
              → pure-TS relationTier synthesize
```

## Features

- Text and/or packaging photo (client compress)
- Multi-agent pipeline + free-tier AI pool (Gemini / OpenAI / Grok / Claude)
- SSE progress UI, relation tier badges, region chips, graph, alternatives
- History + settings + delete local data
- Taiwan always treated as a separate country (not China-related for tiers)
- i18n: English + Traditional Chinese
- Optional GTM via **`VITE_GTM_ID`** (never hardcoded)

## Secrets (important)

| File | Commit? |
|------|---------|
| `.dev.vars` | **Never** — AI keys for local `pages:dev` |
| `.env` | **Never** — e.g. `VITE_GTM_ID` |
| `*.example` | Yes — empty placeholders only |

```bash
cp .dev.vars.example .dev.vars   # fill keys locally
cp .env.example .env             # optional GTM
```

## Quick start (local)

```bash
npm install
# edit .dev.vars — at least one of GEMINI_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY

npm run pages:dev
# http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only (Check API stub) |
| `npm run pages:dev` | Full SPA + Functions |
| `npm run build` | Production `dist/` |
| `npm run deploy` | **Build + deploy to Cloudflare Pages** (local) |
| `npm test` | Unit tests |

## Deploy to Cloudflare (from your machine)

```bash
npx wrangler login          # once
npm run deploy              # project name: originwise
```

Then set production secrets in the Cloudflare dashboard (or `wrangler pages secret put …`).  
Details: [docs/DEPLOY.md](./docs/DEPLOY.md).

## GitHub (private)

```bash
git init
git add .
git status                  # confirm .env / .dev.vars are NOT listed
git commit -m "Initial commit: OriginWise"
gh repo create cn-related-check --private --source=. --remote=origin --push
```

CI deploy is **manual only** (optional). Prefer `npm run deploy` locally.

## Docs

- [docs/DEPLOY.md](./docs/DEPLOY.md) — deploy & secrets
- [docs/DESIGN.md](./docs/DESIGN.md) — architecture
- [SECURITY.md](./SECURITY.md) · [privacy](./public/privacy.html) · [terms](./public/terms.html)

## License

MIT
