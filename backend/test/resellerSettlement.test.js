import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerSettlementBreakdown, completeSellerItem } from '../src/controllers/sellerController.js';
import { resellerReleaseDate } from '../src/utils/resellerReleaseDate.js';
import SellerPayout from '../src/models/SellerPayout.js';
import Seller from '../src/models/Seller.js';
import Order from '../src/models/Order.js';

const sellerId = 'a'.repeat(24);
const item = { product: 'c'.repeat(24), seller: sellerId, name: 'Product', price: 1100, quantity: 2, sellerStatus: 'Delivered', returnApplicable: true, returnDays: 7, deliveredAt: new Date('2026-01-01'), returnWindowClosesAt: new Date('2026-01-08') };
const order = { _id: 'b'.repeat(24), orderNumber: 'TEST', items: [item], payment: { provider: 'cod' }, resellerAttribution: { reseller: 'd'.repeat(24), margin: 100, earning: 200 }, timeline: [] };

for (const shippingMode of ['self', 'shiprocket']) for (const provider of ['cod', 'prepaid']) {
  test(`${shippingMode} ${provider}: full reseller margin is deducted exactly once per quantity`, () => {
    const value = { ...order, payment: { provider } };
    const seller = { shippingMode, commissionRate: 20 };
    const baseline = sellerSettlementBreakdown({ ...value, resellerAttribution: undefined }, item, seller);
    const result = sellerSettlementBreakdown(value, item, seller);
    assert.equal(result.resellerMargin, 200);
    assert.equal(result.netAmount, Math.round((baseline.netAmount - 200) * 100) / 100);
    if (shippingMode === 'self' && provider === 'cod') assert.equal(result.netAmount, -719.2);
  });
}

test('margin is retained in order settlement and payout records', () => {
  const breakdown = sellerSettlementBreakdown(order, item, { shippingMode: 'self' });
  const payout = new SellerPayout({ seller: sellerId, order: order._id, product: item.product, ...breakdown });
  assert.equal(payout.validateSync(), undefined);
  assert.equal(payout.resellerMargin, 200);
  const savedOrder = new Order({ items: [{ ...item, sku: 'TEST', settlement: breakdown }] });
  assert.equal(savedOrder.items[0].settlement.resellerMargin, 200);
});

test('settlement debits a self-shipping wallet below zero and repeat calls do not debit again', async (t) => {
  let payout;
  let balance = 10;
  t.mock.method(SellerPayout, 'findOne', async () => payout);
  t.mock.method(SellerPayout, 'create', async (value) => { payout = value; return value; });
  const update = t.mock.method(Seller, 'updateOne', async (_, change) => { balance += change.$inc.walletBalance; });
  const entry = { ...item };
  const value = { ...order, items: [entry], timeline: [] };
  await completeSellerItem({ order: value, item: entry, seller: { _id: sellerId, shippingMode: 'self' }, config: {} });
  assert.equal(balance, -709.2);
  assert.equal(entry.settlement.resellerMargin, 200);
  assert.equal(entry.sellerStatus, 'Completed');
  await completeSellerItem({ order: value, item: entry, seller: { _id: sellerId, shippingMode: 'self' }, config: {} });
  assert.equal(update.mock.callCount(), 1);
});

test('delivery starts the return window, ignoring the old checkout availability', () => {
  const value = { ...order, resellerAttribution: { availableAt: new Date('2025-01-01') }, items: [{ ...item, returnWindowClosesAt: undefined }] };
  assert.equal(resellerReleaseDate(value).toISOString(), '2026-01-08T00:00:00.000Z');
  value.items[0].deliveredAt = undefined;
  assert.equal(resellerReleaseDate(value), null);
});

test('every item must finish its return window and no active return can remain', () => {
  assert.equal(resellerReleaseDate({ ...order, items: [item, { ...item, returnWindowClosesAt: new Date('2026-01-10') }] }).toISOString(), '2026-01-10T00:00:00.000Z');
  for (const status of ['Requested', 'Approved', 'Pickup Arranged', 'Received', 'Closed']) {
    assert.equal(resellerReleaseDate({ ...order, items: [{ ...item, returnRequest: { status } }] }), null);
  }
  assert.ok(resellerReleaseDate({ ...order, items: [{ ...item, returnRequest: { status: 'Rejected' } }] }));
  assert.equal(resellerReleaseDate({ ...order, items: [{ ...item, sellerStatus: 'Shipped' }] }), null);
});

test('no-return products become eligible on delivery', () => {
  assert.equal(resellerReleaseDate({ ...order, items: [{ ...item, returnApplicable: false, returnWindowClosesAt: undefined }] }).toISOString(), item.deliveredAt.toISOString());
});

test('scheduled wallet release settles the seller before crediting the reseller', async (t) => {
  const { synchronizeAllResellerEarnings } = await import('../src/controllers/resellerController.js');
  const { default: StorefrontSetting } = await import('../src/models/StorefrontSetting.js');
  const { default: Reseller } = await import('../src/models/Reseller.js');
  const { default: ResellerWalletTransaction } = await import('../src/models/ResellerWalletTransaction.js');
  const events = [];
  const entry = { ...item };
  const value = { ...order, items: [entry], resellerAttribution: { ...order.resellerAttribution, status: 'pending' }, timeline: [], save: async () => {} };
  t.mock.method(Order, 'distinct', async () => [order.resellerAttribution.reseller]);
  t.mock.method(Order, 'find', async () => [value]);
  t.mock.method(StorefrontSetting, 'findOne', () => ({ select: async () => ({ sellerSettlement: {} }) }));
  t.mock.method(Seller, 'findById', async () => ({ _id: sellerId, shippingMode: 'self' }));
  t.mock.method(SellerPayout, 'findOne', async () => null);
  t.mock.method(SellerPayout, 'create', async (payout) => payout);
  t.mock.method(Seller, 'updateOne', async (_, change) => { events.push(['seller', change.$inc.walletBalance]); });
  t.mock.method(ResellerWalletTransaction, 'create', async () => ({ save: async () => {} }));
  t.mock.method(Reseller, 'findByIdAndUpdate', async (_, change) => { events.push(['reseller', change.$inc.walletBalance]); return { walletBalance: 200 }; });
  await synchronizeAllResellerEarnings();
  assert.deepEqual(events, [['seller', -719.2], ['reseller', 200]]);
  assert.equal(value.resellerAttribution.status, 'wallet_credited');
});

test('scheduled release keeps future return windows on hold', async (t) => {
  const { synchronizeAllResellerEarnings } = await import('../src/controllers/resellerController.js');
  const { default: ResellerWalletTransaction } = await import('../src/models/ResellerWalletTransaction.js');
  const value = { ...order, items: [{ ...item, returnWindowClosesAt: new Date(Date.now() + 86400000) }], resellerAttribution: { ...order.resellerAttribution, status: 'pending', availableAt: new Date('2020-01-01') }, save: async () => {} };
  t.mock.method(Order, 'distinct', async () => [order.resellerAttribution.reseller]);
  t.mock.method(Order, 'find', async () => [value]);
  const create = t.mock.method(ResellerWalletTransaction, 'create', async () => { throw new Error('Must not credit before deadline'); });
  await synchronizeAllResellerEarnings();
  assert.equal(create.mock.callCount(), 0);
  assert.equal(value.resellerAttribution.status, 'pending');
});
