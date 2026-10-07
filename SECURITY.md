# Security — OriginWise

## Summary

OriginWise is a local-first SPA on Cloudflare Pages with a stateless Pages Function AI proxy (`/api/check`).

| Area | Approach |
|------|----------|
| API keys | Server secrets only (`.dev.vars` / Pages secrets). Never accept client keys. |
| Cross-site | Origin allow-list (`functions/_lib/security.ts`) |
| Abuse | Job rate limits: **1 / 30s · 10 / 6h · 1 in-flight/IP** (Cache API, best-effort per colo) |
| Photos | Client compress; server size caps; not stored as server records |
| History | `localStorage` only (`originwise_v1_*`) |
| Prompts | Built on the server; user text fenced as untrusted data |
| Tier scoring | Pure TypeScript decision table — models emit facts, not final `relationTier` |
| Logs | Job ID, optional IP hash with daily salt (`LOG_IP_SALT`), tier / error code. No raw IP, product text, photo or result text logged by design |
| Web search | Product name + barcode (JAN/EAN) sent to the configured search providers (`SEARCH_PROVIDERS`: Gemini Google Search grounding, Brave, Firecrawl), each under its own policy. Up to 4 result pages are fetched server-side to check the made-in line. Photos are never sent to search |
| Result cache | Text-only results in Cloudflare Cache API, ≤7 days, keyed by SHA-256 of query + locale + settings; not linked to IP. Photo checks not cached |

## Threat model

| Threat | Mitigation |
|--------|------------|
| Prompt injection | Server-built prompts; fenced user content; scope refusals |
| Key theft | Secrets only in CF / `.dev.vars` (gitignored) |
| Cross-origin browser abuse | Origin allow-list + rate limits |
| Free-tier quota burn | Job limits, call budget (≤5), cache, pool / sequential modes |
| SSE long connections | Rate limit on accept; heartbeats; client stall abort → JSON fallback |
| Hallucinated ownership | Verify agent + low confidence + caveats + knowledgeBasis disclaimer |
| Wrong made-in from web pages | Confirmed only when the barcode sits next to the made-in line on the page, or from a label photo; name-only matches are “likely” at most; multi-variant pages stay unconfirmed |
| Untrusted fetched pages | Fetched page text is read with fixed made-in / barcode rules, not passed to a model as instructions; at most 4 pages per check, with size caps |
| Search key theft / quota burn | `FIRECRAWL_API_KEY` / `BRAVE_SEARCH_API_KEY` as Pages secrets only; Gemini source pages are fetched directly so they don't use Firecrawl credits |

## Secrets checklist

See `.dev.vars.example` and `.env.example`.

- Never commit `.dev.vars`, `.env`, or real API keys / account IDs / GTM container IDs in docs.
- Production AI and search keys (`GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, `BRAVE_SEARCH_API_KEY`, …): Cloudflare Pages **encrypted** secrets only.
- Optional analytics: build env `VITE_GTM_ID` only (not in source).
- Optional support link: build env `VITE_BUY_ME_A_PINT_URL` only (not in source).
- Rotate keys if they leak (chat, screenshots, git history, public repos).

## Reporting

Open a private security issue on the project repository if you find a vulnerability.
