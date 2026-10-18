import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { parseVariants } from '../src/lib/product-variants';
import { recordProductChange } from '../src/lib/product-history';
import type { Order } from '../src/types/order';
const sizes = { XS: 0, S: 10, M: 0, L: 0, XL: 0 };
test('validate colors and integer size quantities', () => {
  assert.deepEqual(parseVariants([{ color: ' Blue ', sizes }]), [{ color: 'Blue', sizes }]);
  for (const invalid of [[], null, [{ color: '', sizes }], [{ color: 'Blue', sizes: { ...sizes, S: -1 } }], [{ color: 'Blue', sizes: { ...sizes, S: 1.5 } }], [{ color: 'Blue', sizes }, { color: 'blue', sizes }]]) assert.throws(() => parseVariants(invalid));
});
test('variant edits preserve before/after and production quantities with idempotent retry', async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  const collection = client.db(process.env.MONGODB_DB || 'vatana').collection<Order>(`test_variants_${new ObjectId()}`);
  const _id = new ObjectId(), now = new Date();
  const before = [{ color: 'Blue', sizes }];
  const after = parseVariants([{ color: 'Red', sizes: { ...sizes, M: 5 } }]);
  try {
    await collection.insertOne({ _id, title: 'test', reference: 'test', status: 'new', orderDate: now, createdAt: now, updatedAt: now, products: [{ styleCode: 'test', designName: 'test', productType: 'test', variants: before }] });
    await recordProductChange(collection, String(_id), 0, 'tester', 'production', { status: 'sewing' }, { received: 10, sent: 8, defective: 2 });
    const save = () => recordProductChange(collection, String(_id), 0, 'tester', 'variants', { variants: after }, undefined, '', 'same-variant-request');
    await save(); await save();
    const product = (await collection.findOne({ _id }))!.products[0];
    assert.deepEqual(product.variants, after);
    assert.equal(product.history!.length, 2);
    assert.deepEqual(product.history![1].before.variants, before);
    assert.deepEqual(product.history![1].after.variants, after);
    assert.deepEqual(product.history![0].quantities, { received: 10, sent: 8, defective: 2 });
    assert.equal(product.status, 'sewing');
  } finally { await collection.drop(); await client.close(); }
});
