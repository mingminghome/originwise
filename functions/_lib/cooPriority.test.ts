import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyCooPriority,
  canonCountry,
  extractCooClaimsFromText,
  bestCooClaim,
  keepRealDisputes,
  sameSide,
  settleCooFields,
} from './cooPriority';
import { COUNTRY_NAME_PATTERNS, MADE_IN_CODE_LABEL, canonicalCountry, madeInCodeMatches } from './countryLabel';
import { COUNTRY_LIST_CJK, COUNTRY_LIST_LATIN, countryNameLabel } from './countryNames';
import { applyWebCooGate, labelConfirmsMadeIn, synthesize } from './synthesize';

describe('extractCooClaimsFromText', () => {
  it('pulls Country of Publication as retailer COO', () => {
    const claims = extractCooClaimsFromText(
      'Amazon JP product page — Country of Publication: Thailand\nSources: https://amazon.co.jp/dp/x'
    );
    assert.ok(claims.length >= 1);
    assert.match(claims[0].label, /thailand/i);
    const best = bestCooClaim(claims);
    assert.ok(best);
    assert.notEqual(best!.region, 'CN');
    assert.ok(best!.source === 'retailer' || best!.source === 'unknown');
  });

  it('pulls 製造国 claims', () => {
    const claims = extractCooClaimsFromText(
      'COO: Thailand | source: retailer | via: 製造国 Thailand on retailer page'
    );
    assert.ok(claims.some((c) => /thailand/i.test(c.label)));
  });

  it('prefers retailer origin over ownership HQ wording', () => {
    const claims = extractCooClaimsFromText(
      'Parent holding Midea HQ China. Retailer product page Country of origin: Vietnam.'
    );
    const best = bestCooClaim(claims);
    assert.ok(best);
    assert.match(best!.label, /vietnam/i);
    assert.notEqual(best!.source, 'ownership');
  });
});

describe('applyCooPriority', () => {
  it('clears China madeIn when retailer COO is non-CN', () => {
    const r = applyCooPriority({
      webBrief:
        'COO: Thailand | source: retailer | via: Country of Publication\nCountry of Publication: Thailand',
      madeIn: 'China',
      notes: [],
    });
    assert.equal(r.madeIn, undefined);
    assert.ok(r.confidenceCap != null && r.confidenceCap <= 0.55);
    assert.ok(r.notes.some((n) => /unconfirmed|conflicts/i.test(n)));
  });

  it('fills empty madeIn from retailer COO', () => {
    const r = applyCooPriority({
      webBrief: 'Country of origin: Vietnam on official product page',
      madeIn: undefined,
      notes: [],
    });
    assert.ok(r.madeIn && /vietnam/i.test(r.madeIn));
  });

  it('OCR beats retailer when both present', () => {
    const r = applyCooPriority({
      ocrText: 'Made in Indonesia — packaging label OCR',
      webBrief: 'Country of Publication: China',
      madeIn: undefined,
      notes: [],
    });
    assert.equal(r.preferred?.source, 'ocr');
    assert.match(String(r.preferred?.label || ''), /indonesia/i);
  });

  it('clears ownership-only China stamp', () => {
    const r = applyCooPriority({
      webBrief: 'Parent holding company HQ in China (ownership only).',
      madeIn: 'China',
      notes: [],
    });
    assert.equal(r.madeIn, undefined);
    assert.ok(r.notes.some((n) => /ownership/i.test(n)));
  });

  it('keeps China when retailer COO also says China', () => {
    const r = applyCooPriority({
      webBrief: 'Country of origin: China on retailer product page',
      madeIn: 'China',
      notes: [],
    });
    assert.ok(r.madeIn && /china/i.test(r.madeIn));
  });
});

describe('synthesize + COO priority', () => {
  it('does not stamp high-confidence China when web brief has non-CN retailer COO', () => {
    const r = synthesize({
      jobId: 't-coo-1',
      geoScope: 'global',
      webEnriched: true,
      webBrief:
        'COO: Thailand | source: retailer | via: Country of Publication\nCountry of Publication: Thailand',
      partials: {
        product: {
          name: 'Generic appliance SKU',
          madeIn: 'China',
          confidence: 0.85,
          notes: ['Parent group linked to China'],
        },
        company: {
          name: 'Generic Brand',
          hqCountry: 'China',
          confidence: 0.7,
        },
      },
    });
    assert.notEqual(
      String(r.product?.madeIn || '').toLowerCase(),
      'china',
      'must not keep China stamp against retailer Thailand COO'
    );
  });
});

describe('package label OCR (Pigeon Softouch glass)', () => {
  // Text as read from the Softouch box: body made in Japan, nipple made in a China plant.
  const SOFTOUCH_OCR = [
    'ピジョン 母乳実感 哺乳びん 耐熱ガラス製 160ml',
    '生産・組み立て：日本',
    '乳首：シリコーンゴム 中国工場製',
    '販売元 ピジョン株式会社 東京都中央区',
  ].join('\n');

  it('reads 生産・組み立て：日本 and 中国工場製 as made-in claims', () => {
    const claims = extractCooClaimsFromText(SOFTOUCH_OCR);
    assert.ok(claims.some((c) => c.region === 'OTHER' && /日本/.test(c.label)), JSON.stringify(claims));
    assert.ok(claims.some((c) => c.region === 'CN' && /中国/.test(c.label)), JSON.stringify(claims));
  });

  it('reads other label forms: 原産国名、組立、タイ製、Assembled in', () => {
    const labels = (txt: string) => extractCooClaimsFromText(txt).map((c) => c.label);
    assert.ok(labels('原産国名：タイ').some((l) => /タイ|thailand/i.test(l)));
    assert.ok(labels('組み立て：中国').some((l) => /中国/.test(l)));
    assert.ok(labels('タイ製').some((l) => /thailand/i.test(l)));
    assert.ok(labels('Assembled in Vietnam').some((l) => /vietnam/i.test(l)));
    assert.ok(labels('组装：中国').some((l) => /中国/.test(l)));
  });

  it('web gate keeps a made-in the label confirms, with basis label', () => {
    const gated = applyWebCooGate(
      { name: 'Softouch glass 160ml', madeIn: 'Japan', confidence: 0.7 },
      [{ country: 'Thailand', basis: 'name', status: 'likely' }],
      SOFTOUCH_OCR
    );
    assert.equal(gated.product?.madeIn, 'Japan');
    assert.equal(gated.madeInBasis, 'label');
  });

  it('web gate still strips a made-in the label does not name', () => {
    const gated = applyWebCooGate(
      { name: 'Softouch glass 160ml', madeIn: 'Thailand', confidence: 0.7 },
      [{ country: 'Thailand', basis: 'name', status: 'likely' }],
      SOFTOUCH_OCR
    );
    assert.equal(gated.product?.madeIn, undefined);
    assert.equal(gated.madeInBasis, undefined);
  });

  it('labelConfirmsMadeIn matches English and CJK names', () => {
    assert.equal(labelConfirmsMadeIn('Japan', SOFTOUCH_OCR), true);
    assert.equal(labelConfirmsMadeIn('China', SOFTOUCH_OCR), true);
    assert.equal(labelConfirmsMadeIn('Thailand', SOFTOUCH_OCR), false);
    assert.equal(labelConfirmsMadeIn('Japan', ''), false);
  });

  it('synthesize returns madeInBasis label for a label-confirmed made-in', () => {
    const r = synthesize({
      jobId: 'softouch',
      geoScope: 'prc',
      ocrText: SOFTOUCH_OCR,
      webEnriched: true,
      webCoo: [],
      partials: {
        product: { name: 'Softouch glass 160ml', brand: 'Pigeon', madeIn: 'Japan', confidence: 0.8 },
        company: { name: 'Pigeon', hqCountry: 'Japan', confidence: 0.9 },
      },
    });
    assert.equal(r.product?.madeIn, 'Japan');
    assert.equal(r.product?.madeInBasis, 'label');
  });
});

describe('canonCountry: every name the display can produce maps to one key (round 20)', () => {
  const unesc = (s: string) => s.replace(/\\s\+/g, ' ').replace(/\\(.)/g, '$1');
  it('each countryNames name (English, Japanese, Traditional, Simplified) has its English label key', () => {
    for (const list of [COUNTRY_LIST_LATIN, COUNTRY_LIST_CJK]) {
      for (const name of list.split('|').map(unesc)) {
        const label = countryNameLabel(name);
        assert.ok(label, name);
        assert.equal(canonCountry(name), canonCountry(label), `${name} vs ${label}`);
      }
    }
  });
  it('the made-in codes and the free-text table agree with countryNames', () => {
    for (const [code, label] of Object.entries(MADE_IN_CODE_LABEL)) assert.equal(canonCountry(code), canonCountry(label), code);
    for (const row of COUNTRY_NAME_PATTERNS) assert.equal(canonCountry(row.label), canonCountry(countryNameLabel(row.label) ?? row.label), row.label);
  });
  it('China, Hong Kong, Macau and Taiwan stay four places', () => {
    const keys = ['中國', '香港', '澳門', '台灣'].map(canonCountry);
    assert.equal(new Set(keys).size, 4);
    assert.equal(canonCountry('Republic of China'), canonCountry('Taiwan'));
    assert.notEqual(canonCountry("People's Republic of China"), canonCountry('Taiwan'));
  });
});

describe('round 21: dedupe keys, the final check and the Korea names', () => {
  it("DPRK / Democratic People's Republic of Korea / D.P.R. Korea are North Korea; Republic of Korea / Korea are South Korea", () => {
    for (const s of ["Democratic People's Republic of Korea", 'Democratic People’s Republic of Korea', 'D.P.R. Korea', 'DPR Korea', 'DPRK', 'North Korea', '北韓']) {
      assert.equal(canonicalCountry(s), 'North Korea', s);
      assert.equal(COUNTRY_NAME_PATTERNS.find((r) => r.label === 'South Korea')!.pattern.test(s), false, s);
    }
    for (const s of ['Republic of Korea', 'Korea, Republic of', 'South Korea', 'Korea', '韓國']) assert.equal(canonicalCountry(s), 'South Korea', s);
  });

  it('dedupe keys on the display / canonical names only, never a free-text hit inside a longer name', () => {
    const apart: Array<[string, string]> = [
      ['New Mexico', 'Mexico'],
      ['Netherlands Antilles', 'Netherlands'],
      ["Democratic People's Republic of Korea", 'Korea'],
      ["Democratic People's Republic of Korea", 'South Korea'],
      ['D.P.R. Korea', 'Republic of Korea'],
      ['North Korea', 'South Korea'],
      ['北韓', '韓國'],
      ['DPRK', 'KR'],
    ];
    for (const [a, b] of apart) {
      assert.equal(sameSide(a, b), false, `${a} / ${b}`);
      assert.notEqual(canonCountry(a), canonCountry(b), `${a} / ${b}`);
    }
    for (const [a, b] of [['Germany', '德國'], ['ドイツ', 'Germany'], ['UK', '英國'], ['Viet Nam', 'Vietnam'], ['The Netherlands', '荷蘭']]) {
      assert.equal(sameSide(a!, b!), true, `${a} / ${b}`);
    }
  });

  it('name lookup: two spellings of one country are no 爭議 (settled text keeps the claim)', () => {
    for (const s of ['Made in Germany\n德國製造', '德國製\nドイツ製', 'Made in UK\n英國製造', 'Made in Türkiye\nMade in Turkey']) {
      assert.deepEqual(settleCooFields(s).disputes, [], s);
    }
  });

  it('claim list: one country written two ways is one claim (canon-keyed dedupe)', () => {
    for (const s of ['德國製\nドイツ製', 'Made in Germany\n德國製造', 'Made in UK\n英國製造', 'Made in Türkiye\nMade in Turkey']) {
      const claims = extractCooClaimsFromText(s);
      assert.equal(claims.length, 1, `${s}: ${JSON.stringify(claims)}`);
    }
  });

  it('final check: a one-country 爭議 is dropped and its claims put back; a real one stays', () => {
    const text = 'Made in Germany\n德國製造\nMade in China\nMade in Japan';
    const chars = text.split('').map((c) => (c === '\n' ? c : ' '));
    const one = { sides: ['Germany', '德國'], start: 0, end: 20 };
    const real = { sides: ['China', 'Japan'], start: 21, end: text.length };
    const kept = keepRealDisputes([one, real], chars, text);
    assert.deepEqual(kept, [real]);
    assert.equal(chars.join('').slice(0, 20), text.slice(0, 20));
    assert.equal(chars.join('').slice(21).trim(), '');
    // A single-side 爭議 is no 爭議 either.
    const chars2 = text.split('');
    assert.deepEqual(keepRealDisputes([{ sides: ['Germany'], start: 0, end: 15 }], chars2, text), []);
  });
});

describe('round 22: a negation before made-in takes any run of spaces, tabs or NBSP, on its line only', () => {
  it('made-in codes', () => {
    for (const s of ['Not made in USA', 'Not  made in USA', 'Not\u00a0\u00a0made in USA', 'Never\u00a0made in UK', 'Isn’t \t made in CN', 'NOT  MADE IN USA']) {
      assert.deepEqual(madeInCodeMatches(s), [], s);
    }
    for (const s of ['Not.\u00a0Made in USA', 'Not\nMade in USA', 'Made in USA']) assert.equal(madeInCodeMatches(s).length, 1, s);
  });
});
