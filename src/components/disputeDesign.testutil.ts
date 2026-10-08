/**
 * Example data for the design / dispute cards (no live lookups): page text
 * goes through the real made-in gate (regexCooClaims → gateClaims) and the
 * real synthesize, exactly as a Firecrawl / Brave answer would.
 */
import type { CheckResult } from '../core/types';
import type { FetchedPage } from '../../functions/_lib/search/types';
import {
  designFromPages,
  findJans,
  gateClaims,
  regexCooClaims,
  webCooFromKept,
} from '../../functions/_lib/search/extract';
import { synthesize } from '../../functions/_lib/synthesize';

export const MELIO = 'Cybex Melio';
export const JAN = '4058511012346';

export const URLS = {
  momo: 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=10501',
  mami: 'https://mamilove.com.tw/product/cybex-melio',
  brand: 'https://www.cybex-online.com/zh-tw/melio',
  shopDe: 'https://www.kinderwagen-shop.de/cybex-melio',
  jan: 'https://www.babyhome.com.tw/item/4058511012346',
  apple: 'https://www.apple.com/iphone-15/specs/',
};

export const page = (url: string, title: string, text: string): FetchedPage => ({
  url,
  title,
  text: `${title}\n${text}`,
});

export function runPages(opts: {
  pages: FetchedPage[];
  entity?: string;
  madeIn?: string;
  ocrText?: string;
  notes?: string[];
  confidence?: number;
}): CheckResult {
  const entity = opts.entity ?? MELIO;
  const jans = findJans(entity, opts.ocrText);
  const { kept, design } = gateClaims(entity, jans, opts.pages, regexCooClaims(opts.pages));
  const coo = webCooFromKept(kept, opts.pages);
  const sources = opts.pages.map((p) => `${p.title} — ${p.url}`);
  const r = synthesize({
    jobId: 'design',
    geoScope: 'prc',
    locale: 'zh-Hant',
    webEnriched: true,
    webBrief: 'x',
    sources,
    webCoo: coo,
    webDesign: designFromPages(design, opts.pages),
    ...(opts.ocrText ? { ocrText: opts.ocrText } : {}),
    partials: {
      product: {
        name: `${entity} 嬰兒推車`,
        brand: entity.split(' ')[0],
        ...(opts.madeIn ? { madeIn: opts.madeIn } : {}),
        ...(opts.notes ? { notes: opts.notes } : {}),
        confidence: opts.confidence ?? 0.9,
      },
    },
  });
  return {
    ...r,
    sources,
    meta: {
      ...r.meta,
      searchProvider: 'firecrawl',
      ...(coo.length ? { searchCoo: coo } : {}),
      searchMatch: coo.some((c) => c.basis === 'barcode')
        ? 'barcode'
        : r.product?.madeInBasis === 'model'
          ? 'model'
          : 'name',
    },
  } as CheckResult;
}

/** The three Cybex cases Ming named, then Tester's (a) and (b). */
export const DISPUTE_CASES = {
  /** 1 · only an "Engineered in Germany" page: 未確認, no 德國 candidate, 附加資訊. */
  dispute1: () =>
    runPages({
      pages: [page(URLS.brand, 'CYBEX Melio 嬰兒推車｜CYBEX 官方', 'Engineered in Germany. 輕量 5.9 kg，單手收車。')],
    }),
  /** 2 · AI 中國 + exact-model 產地：中國 page + German design page: 中國 75% + 附加資訊. */
  dispute2: () =>
    runPages({
      madeIn: 'China',
      pages: [
        page(URLS.momo, 'Cybex Melio 嬰兒推車 - momo購物網', '商品規格\n產地：中國\n重量：5.9 kg'),
        page(URLS.brand, 'CYBEX Melio 嬰兒推車｜CYBEX 官方', 'Engineered in Germany. 德國設計，輕量好收。'),
      ],
    }),
  /** 3 · exact-model pages: 產地：中國 vs Made in Germany → 未確認 + 爭議. */
  dispute3: () =>
    runPages({
      pages: [
        page(URLS.momo, 'Cybex Melio 嬰兒推車 - momo購物網', '商品規格\n產地：中國\n重量：5.9 kg'),
        page(URLS.shopDe, 'Cybex Melio Kinderwagen', 'Produktdetails\nMade in Germany\nGewicht: 5,9 kg'),
      ],
    }),
  /** (a) "Designed in Germany" page + barcode page with Made in China: 中國 confirmed, 附加資訊, no 爭議. */
  dispute4: () =>
    runPages({
      ocrText: `JAN ${JAN}`,
      pages: [
        page(URLS.jan, `Cybex Melio 嬰兒推車 ${JAN}`, `條碼：${JAN}\nMade in China`),
        page(URLS.brand, 'CYBEX Melio 嬰兒推車｜CYBEX 官方', 'Designed in Germany. 輕量 5.9 kg。'),
      ],
    }),
  /** (b) one sentence "Designed in Germany, made in China": only China counts. */
  dispute5: () =>
    runPages({
      pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', 'Designed in Germany, made in China. 5.9 kg。')],
    }),
  /** Label photo 「設計於德國 中國製造」: 中國 95% from the label, 德國 as 附加資訊. */
  dispute6: () => runPages({ madeIn: 'China', ocrText: 'CYBEX Melio\n設計於德國 中國製造', pages: [] }),
};
