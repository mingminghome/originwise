# Security — OriginWise

## Summary

OriginWise is a local-first SPA on Cloudflare Pages with a stateless Pages Function AI proxy (`/api/check`).

| Area | Approach |
|------|----------|
| API keys | Server secrets only (`.dev.vars` / Pages secrets). Never accept client keys. |
| Cross-site | Origin allow-list (`functions/_lib/security.ts`) |
| Abuse | Job rate limits: **2/min · 10/day · 1 in-flight/IP** (Cache API, best-effort per colo) |
| Photos | Client compress; server size caps; not stored as server records |
| History | `localStorage` only (`originwise_v1_*`) |
| Prompts | Built on the server; user text fenced as untrusted data |
| Tier scoring | Pure TypeScript decision table — models emit facts, not final `relationTier` |
| Logs | Optional IP hash with daily salt (`LOG_IP_SALT`); no raw IP logging by design |

## Threat model

| Threat | Mitigation |
|--------|------------|
| Prompt injection | Server-built prompts; fenced user content; scope refusals |
| Key theft | Secrets only in CF / `.dev.vars` (gitignored) |
| Cross-origin browser abuse | Origin allow-list + rate limits |
| Free-tier quota burn | Job limits, call budget (≤5), cache, pool / sequential modes |
| SSE long connections | Rate limit on accept; heartbeats; client stall abort → JSON fallback |
| Hallucinated ownership | Verify agent + low confidence + caveats + knowledgeBasis disclaimer |

## Secrets checklist

See `.dev.vars.example` and `.env.example`.

- Never commit `.dev.vars`, `.env`, or real API keys / account IDs / GTM container IDs in docs.
- Production AI keys: Cloudflare Pages **encrypted** secrets only.
- Optional analytics: build env `VITE_GTM_ID` only (not in source).
- Rotate keys if they leak (chat, screenshots, git history, public repos).

## Reporting

Open a private security issue on the project repository if you find a vulnerability.
