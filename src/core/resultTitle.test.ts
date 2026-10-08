/**
 * Headline = the user's query; model name only as "Identified as".
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resultTitle } from './resultTitle';

describe('resultTitle', () => {
  it('shows the query when the model re-spells it (Cybex Mello)', () => {
    const r = resultTitle({ title: 'Cybex Mello', product: { name: 'Cybex Mello' } }, 'Cybex Melio');
    assert.deepEqual(r, { title: 'Cybex Melio', modelName: 'Cybex Mello' });
  });

  it('no "identified as" line when the model name matches the query', () => {
    assert.deepEqual(
      resultTitle({ title: 'TP-Link Tapo C200', product: { name: 'TP-Link Tapo C200' } }, 'tp-link tapo c200'),
      { title: 'tp-link tapo c200', modelName: undefined }
    );
  });

  it('barcode query: barcode as headline, product name as the identified line', () => {
    const r = resultTitle(
      { title: '母乳実感 Sheer PPSU 240ml', product: { name: '母乳実感 Sheer PPSU 240ml' } },
      '4902508277471'
    );
    assert.equal(r.title, '4902508277471');
    assert.equal(r.modelName, '母乳実感 Sheer PPSU 240ml');
  });

  it('photo-only check (no query) keeps the model title', () => {
    assert.deepEqual(resultTitle({ title: 'Pigeon Softouch' }, ''), { title: 'Pigeon Softouch' });
    assert.deepEqual(resultTitle({ title: 'Pigeon Softouch' }, undefined), { title: 'Pigeon Softouch' });
  });
});
