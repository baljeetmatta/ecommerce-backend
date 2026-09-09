import test from 'node:test';
import assert from 'node:assert/strict';
import ReelView from '../src/models/ReelView.js';
import ReelEngagement from '../src/models/ReelEngagement.js';
import { recordReelView } from '../src/controllers/storefrontController.js';

function invoke(body = { visitorId: 'test-browser' }) {
  return new Promise(resolve => {
    const result = {};
    recordReelView({ body, params: { productId: '507f1f77bcf86cd799439011' } }, {
      status(code) { result.status = code; return this; },
      json(data) { resolve({ ...result, data }); }
    }, error => resolve({ ...result, error }));
  });
}
for (const [label, age, modified, expected] of [
  ['new visitor', null, 1, 1],
  ['repeat within one minute', 10_000, 1, 0],
  ['repeat after one minute', 61_000, 1, 1],
  ['concurrent repeat already counted', 61_000, 0, 0]
]) test(label, async t => {
  t.mock.method(ReelView, 'findOne', () => ({ select: async () => age === null ? null : { _id: 'view', lastViewedAt: new Date(Date.now() - age) } }));
  t.mock.method(ReelView, 'create', async () => ({}));
  t.mock.method(ReelView, 'updateOne', async () => ({ modifiedCount: modified }));
  const increment = t.mock.method(ReelEngagement, 'findOneAndUpdate', async (_filter, update) => assert.equal(update.$inc.viewCount, 1));
  t.mock.method(ReelEngagement, 'findOne', () => ({ populate: async () => ({ viewCount: 12, likes: [], comments: [] }) }));
  const result = await invoke();
  assert.ifError(result.error);
  assert.equal(result.data.viewCount, 12);
  assert.equal(increment.mock.callCount(), expected);
});
test('anonymous requests require a visitor identity', async () => {
  const result = await invoke({});
  assert.equal(result.status, 400);
  assert.match(result.error.message, /visitor identifier/);
});
