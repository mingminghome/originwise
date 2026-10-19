# OriginWise — Product Origin Checker

| Field | Value |
|-------|--------|
| **Product name** | **OriginWise** |
| **Repo / workspace** | `originwise` |
| **Author** | MingMingHomeWork |
| **Date** | 2026-08-02 |
| **Status** | Implemented. Identity JSON, our page fetch, tidy JSON, a quote check, then a score JSON. See [README](../README.md). |
| **Deploy target** | Cloudflare Pages (SPA + Pages Functions) |
| **Scaffold** | React + Vite SPA with Pages Functions |

---

## Overview

**OriginWise** is a local-first progressive web app that helps users check whether a product, food item, brand, or company is related to the **People’s Republic of China (PRC)** — covering place of origin, manufacturer origin, company ownership/relations, and similar brand/product alternatives.

**Current check.** Identity reads brand, product, and model and does not name a country. We fetch the pages. Tidy writes claims from that page text. A claim stays only when its quote is on a fetched page. The score step writes the summary, the 0–100 score, and the Made in and Link to China cards. The page prints that JSON. Search marks model and size tokens with `+`, joins origin words with `OR`, and appends `-youtube.com`. The next search provider runs until two fetched pages have real text. Brave and Firecrawl run one wider follow-up when the first batch has only one usable page. The server fetches up to 4 pages. Details are in the [README](../README.md).

Stack: React 19 + Vite + TypeScript, Cloudflare Pages SPA + `functions/`, localStorage-only history/settings, client image compress, server-built prompts, multi-provider LLM keys, Cache API rate limits, EN + zh-Hant and EU locales.

The old multi-agent design (`CHECK_MODE` multi / dual / monolith, `synthesize.ts`, and the agent partial schemas) is not in this repo. A check is identity, then our page fetch, then tidy, then score.
