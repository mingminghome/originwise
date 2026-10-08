import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanSourceLine,
  cleanSources,
  isSearchResultUrl,
  sourceLabel,
  splitSourceLine,
} from './sourceLine';
import { fixZhHantDeep, fixZhHantText, toTraditionalZh } from './zhHant';

describe('source lines', () => {
  it('keeps a long escaped URL whole and caps only the title', () => {
    const url =
      'https://www.amazon.co.jp/%E3%83%94%E3%82%B8%E3%83%A7%E3%83%B3-%E6%AF%8D%E4%B9%B3%E5%AE%9F%E6%84%9F-%E3%82%AC%E3%83%A9%E3%82%B9-160ml/dp/B0XXXXXX';
    const line = `${'T'.repeat(300)} — ${url}`;
    const out = cleanSourceLine(line);
    assert.ok(out.endsWith(url));
    assert.equal(splitSourceLine(out).title.length, 120);
  });

  it('trims a dangling percent-escape left by an earlier cut', () => {
    const p = splitSourceLine('Pigeon — https://kakaku.com/item/K000%E3%8');
    assert.equal(p.url, 'https://kakaku.com/item/K000');
  });

  it('drops search-results pages', () => {
    for (const u of [
      'https://kakaku.com/search_results/%83s%83W%83%87%83%93/',
      'https://www.amazon.co.jp/s?k=pigeon+sheer',
      'https://www.google.com/search?q=pigeon',
      'https://search.rakuten.co.jp/search/mall/pigeon/',
      'https://www.ebay.co.uk/sch/i.html?_nkw=pigeon',
    ]) {
      assert.ok(isSearchResultUrl(u), u);
      assert.equal(cleanSourceLine(`x — ${u}`), '', u);
    }
    assert.equal(isSearchResultUrl('https://kakaku.com/item/K0001234567/'), false);
    assert.equal(isSearchResultUrl('https://www.amazon.co.jp/dp/B0XXXX'), false);
  });

  it('de-duplicates by URL and caps the list', () => {
    const list = cleanSources(
      [
        'A — https://shop.example.jp/a',
        'A again — https://shop.example.jp/a',
        'Search — https://www.amazon.co.jp/s?k=x',
        'Plain title only',
      ],
      8
    );
    assert.deepEqual(list, ['A — https://shop.example.jp/a', 'Plain title only']);
  });

  it('labels a bare URL by its host', () => {
    assert.equal(sourceLabel(splitSourceLine('https://www.pigeon.co.jp/x')), 'pigeon.co.jp');
  });
});

describe('zh-Hant cleanup', () => {
  it('converts Simplified slips to Traditional', () => {
    assert.equal(toTraditionalZh('奶嘴為硅胶，具体产地未标示'), '奶嘴為矽膠，具體產地未標示');
    assert.equal(toTraditionalZh('已是繁體中文，不變'), '已是繁體中文，不變');
  });

  it('turns English leftovers inside Chinese text into Chinese', () => {
    assert.equal(
      fixZhHantText('瓶身標示 Made in Japan，SKU 1026732；奶嘴產地 unknown'),
      '瓶身標示 日本製，商品編號 1026732；奶嘴產地 未知'
    );
    assert.equal(fixZhHantText('零件來自 China 工廠的矽膠奶嘴與瓶蓋組件'), '零件來自 中國 工廠的矽膠奶嘴與瓶蓋組件');
  });

  it('leaves mostly-English server lines and kept sentences alone', () => {
    const server = 'Final COO unconfirmed — no SKU/label country of origin; do not invent made-in.';
    assert.equal(fixZhHantText(server, [server]), server);
    assert.equal(fixZhHantText('Made in Japan'), 'Made in Japan');
  });

  it('walks a result but skips sources and meta', () => {
    const r = {
      notes: ['具体見標籤'],
      sources: ['硅胶 — https://x.example/a'],
      meta: { note: '具体' },
      product: { parts: [{ note: '硅胶奶嘴' }] },
    };
    const out = fixZhHantDeep(r, [], new Set(['sources', 'meta']));
    assert.deepEqual(out.notes, ['具體見標籤']);
    assert.deepEqual(out.sources, ['硅胶 — https://x.example/a']);
    assert.equal(out.meta.note, '具体');
    assert.equal(out.product.parts[0].note, '矽膠奶嘴');
  });
});
