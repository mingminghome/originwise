import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyCooPriority,
  extractCooClaimsFromText,
  bestCooClaim,
} from './cooPriority';
import { synthesize } from './synthesize';

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
