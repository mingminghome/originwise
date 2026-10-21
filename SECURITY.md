# Security — OriginWise

## Summary

OriginWise is a single-page app on Cloudflare Pages (history and settings stay in the browser) with a stateless Pages Function AI proxy (`/api/check`).

| Area | Approach |
|------|----------|
| API keys | Server secrets only (`.dev.vars` / Pages secrets). Never accept client keys. |
| Cross-site | Origin allow-list (`functions/_lib/security.ts`) |
| Abuse | Job rate limits: **1 / 30s · 10 / 6h · 1 in-flight/IP** (Cache API, best-effort per colo) |
| Photos | Client compress; server size caps; not stored as server records |
| History | `localStorage` only (`originwise_v2_*`). An older `originwise_v1_*` copy is moved once, then removed |
| Prompts | Built on the server; user text fenced as untrusted data |
| Tier scoring | The score step writes 0–100 and the Made in and Link to China cards from facts that passed the quote check. There is no TypeScript tier table |
| Logs | Job ID, optional IP hash with daily salt (`LOG_IP_SALT`), tier / error code. No raw IP, product text, photo or result text logged by design |
| Web search | Product name, and a barcode when the text contains one, sent to the configured search providers (`SEARCH_PROVIDERS`: Gemini Google Search grounding, Brave, Firecrawl), each under its own policy. Up to 4 result pages are fetched. Their text goes to the tidy step. Photos are never sent to search |
| Result cache | Text-only results in Cloudflare Cache API, ≤7 days, keyed by SHA-256 of query + locale + settings; not linked to IP. Photo checks not cached |

## Threat model

| Threat | Mitigation |
|--------|------------|
| Prompt injection | Server-built prompts; fenced user content; scope refusals |
| Key theft | Secrets only in CF / `.dev.vars` (gitignored) |
| Cross-origin browser abuse | Origin allow-list + rate limits |
| Free-tier quota burn | Job limits, a cap of 4 shared calls for identity and tidy, a cap of 2 for the score step, cache, and the provider pool |
| SSE long connections | Rate limit on accept; heartbeats; client stall abort → JSON fallback |
| Hallucinated ownership | Verify agent + low confidence + caveats + knowledgeBasis disclaimer |
| Wrong made-in from web pages | A made-in, part, relation, or design line is dropped unless its quote appears on a fetched page. A made-in is confirmed only when two exact-model pages on different sites name one country, or the model's country matches one such page, and no page names another place. A continent is not a country. One page is a source. A user review is not a made-in source. Disagreeing pages stay unconfirmed |
| Untrusted fetched pages | Page text is fenced data in the tidy prompt. The quote check is the gate. At most 4 pages per check, with size caps |
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
