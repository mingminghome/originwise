/**
 * Made-in regression harness (PR #36): the same three paths Tester probes.
 * - label: package-label OCR text only (no AI made-in, no web)
 * - page:  one name-matched retailer page through the real page gate
 * - note:  the text as a model note
 * - parts: the text as the model's componentsOrigin field (parts code list)
 * - pagecard: the page path, but the candidates as the zh-Hant card shows them
 *   (越南, 斯里蘭卡), so a raw page label (ベトナム, Viet Nam) fails the row
 * Each run is reduced to one comparable summary.
 */
import { canonicalCountry } from '../../functions/_lib/countryLabel';
import {
  designFromPages,
  findJans,
  gateClaims,
  regexCooClaims,
  webCooFromKept,
} from '../../functions/_lib/search/extract';
import { synthesize } from '../../functions/_lib/synthesize';
import { createT } from '../core/i18n';
import { localizeCountry } from '../core/i18n/countries';
import type { CheckResult } from '../core/types';
import { buildMadeInView } from './resultCards.model';

export type RegPath = 'label' | 'page' | 'pagecard' | 'note' | 'parts';
export type RegSummary = {
  /** Confirmed country, or the candidate countries (comma list), or null. */
  country: string | null;
  /**
   * 'label 95%' when confirmed; else candidate grades (comma list), plus ' 爭議'
   * when the card shows a 爭議 line. A 爭議 line with no candidate rows (two
   * made-in claims on one label) reads '爭議 China,Japan'. null when none.
   */
  grade: string | null;
  /** Design / brand info rows: 'd:Germany', 'b:Germany' (comma list) or null. */
  design: string | null;
};

const ENT = 'Cybex Melio';
const base = { jobId: 'reg', geoScope: 'prc', locale: 'zh-Hant', sources: [] as string[] };
const canon = (l: string) => canonicalCountry(l) ?? l;
const zh = createT('zh-Hant');

function run(path: Exclude<RegPath, 'pagecard'>, text: string): CheckResult {
  if (path === 'label') {
    return synthesize({
      ...base,
      webEnriched: false,
      ocrText: text,
      partials: { product: { name: ENT, brand: 'Cybex', confidence: 0.8 } },
    } as Parameters<typeof synthesize>[0]) as unknown as CheckResult;
  }
  if (path === 'parts') {
    return synthesize({
      ...base,
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: 'X', brand: 'Y', componentsOrigin: text, confidence: 0.8 } },
    } as Parameters<typeof synthesize>[0]) as unknown as CheckResult;
  }
  if (path === 'note') {
    return synthesize({
      ...base,
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: ENT, brand: 'Cybex', notes: [text], confidence: 0.8 } },
    } as Parameters<typeof synthesize>[0]) as unknown as CheckResult;
  }
  const pages = [
    {
      url: 'https://www.momoshop.com.tw/goods/x',
      title: 'Cybex Melio 嬰兒推車 - momo購物網',
      text: `Cybex Melio 嬰兒推車 - momo購物網\n${text}`,
    },
  ];
  const g = gateClaims(ENT, findJans(ENT, undefined), pages, regexCooClaims(pages));
  const coo = webCooFromKept(g.kept, pages);
  const r = synthesize({
    ...base,
    webEnriched: true,
    webBrief: 'x',
    sources: pages.map((p) => `${p.title} — ${p.url}`),
    webCoo: coo,
    webDesign: designFromPages(g.design, pages),
    partials: { product: { name: `${ENT} 嬰兒推車`, brand: 'Cybex', confidence: 0.9 } },
  } as Parameters<typeof synthesize>[0]) as unknown as CheckResult;
  // As the orchestrator does: the page claims ride along for the card (爭議 page counts).
  if (coo.length) r.meta = { ...r.meta, searchCoo: coo } as CheckResult['meta'];
  return r;
}

export function summarize(path: RegPath, text: string): RegSummary {
  const v = buildMadeInView(run(path === 'pagecard' ? 'page' : path, text));
  const shown = path === 'pagecard' ? (l: string) => localizeCountry(zh, l) : canon;
  const design = (v.designRows ?? []).map((d) => `${d.kind[0]}:${canon(d.country)}`).join(',') || null;
  if (v.state === 'confirmed' && v.country) {
    return { country: canon(v.country), grade: `${v.basis} ${Math.round((v.confidence ?? 0) * 100)}%`, design };
  }
  const c = v.candidates;
  const sides = (v.dispute ?? []).map((d) => shown(d.country)).join(',');
  return {
    country: c.length ? c.map((x) => shown(x.label)).join(',') : null,
    grade: c.length
      ? c.map((x) => (x.neutral ? 'neutral' : (x.rating ?? x.source))).join(',') + (v.dispute ? ' 爭議' : '')
      : v.dispute
        ? `爭議 ${sides}`
        : null,
    design,
  };
}
