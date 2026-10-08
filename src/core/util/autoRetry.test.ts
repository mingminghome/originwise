/**
 * Free-server 429 auto re-submit: capped so it never loops.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autoRetrySeconds, MAX_AUTO_RETRIES } from './autoRetry';

describe('autoRetrySeconds', () => {
  const inflight = { code: 'rate_limited' as const, meta: { window: 'inflight', retryAfterSec: 30 } };

  it('waits the server hint once for an in-flight check', () => {
    assert.equal(autoRetrySeconds(inflight, 0), 30);
  });

  it('stops after MAX_AUTO_RETRIES automatic re-submits (no 30 s loop)', () => {
    assert.equal(MAX_AUTO_RETRIES, 1);
    assert.equal(autoRetrySeconds(inflight, 1), null);
    assert.equal(autoRetrySeconds(inflight, 5), null);
  });

  it('never auto-retries the 6-hour cap', () => {
    assert.equal(autoRetrySeconds({ code: 'rate_limited_day' }, 0), null);
    assert.equal(
      autoRetrySeconds({ code: 'rate_limited', meta: { window: 'long', retryAfterSec: 600 } }, 0),
      null
    );
  });

  it('short window: clamps to 1–120 s and defaults to 30 s', () => {
    assert.equal(autoRetrySeconds({ code: 'rate_limited', meta: { window: 'short' } }, 0), 30);
    assert.equal(
      autoRetrySeconds({ code: 'rate_limited', meta: { window: 'short', retryAfterSec: 0.2 } }, 0),
      1
    );
    assert.equal(
      autoRetrySeconds({ code: 'rate_limited', meta: { window: 'short', retryAfterSec: 999 } }, 0),
      120
    );
  });
});
