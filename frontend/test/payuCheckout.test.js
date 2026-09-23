import test from 'node:test';
import assert from 'node:assert/strict';
import { readPayuReturn, clearPayuReturn } from '../src/utils/payuCheckout.js';

const setup = (stored, suffix = '?payu_txnid=tx123&payu_status=success') => {
  const values = new Map([['hrbasket_payu_pending', stored]]);
  globalThis.sessionStorage = { getItem: key => values.get(key), removeItem: key => values.delete(key) };
  globalThis.window = { location: { href: `https://shop.example/checkout${suffix}` }, history: { state: { existing: true }, replaceState(state, _, href) { this.state = state; window.location.href = href; } } };
};

test('payment return stays available for repeated reads and retries until confirmation', () => {
  setup(JSON.stringify({ txnid: 'tx123', kind: 'storefront', orderPayload: { items: [1] } }));
  const first = readPayuReturn();
  assert.equal(first.kind, 'storefront');
  assert.deepEqual(readPayuReturn(), first);
  clearPayuReturn();
  assert.equal(readPayuReturn(), null);
  assert.deepEqual(window.history.state, { existing: true });
});

test('missing, corrupt, or unrelated storage never attaches another order to payment', () => {
  for (const stored of [undefined, '{invalid', JSON.stringify({ txnid: 'other', orderPayload: { items: [1] } })]) {
    setup(stored);
    assert.deepEqual(readPayuReturn(), { txnid: 'tx123', status: 'success' });
  }
});

test('clearing a return preserves unrelated query parameters and hash routes', () => {
  setup('{}', '?campaign=summer&payu_txnid=tx123&payu_status=success#/checkout');
  clearPayuReturn();
  assert.equal(window.location.href, 'https://shop.example/checkout?campaign=summer#/checkout');
});
