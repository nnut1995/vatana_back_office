import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { encode } from 'next-auth/jwt';
import { parseStaffInput, saveStaff } from '../src/lib/staff';
import { recordProductChange } from '../src/lib/product-history';
import type { User } from '../src/types/user';
import type { Order } from '../src/types/order';

test('staff validation rejects invalid roles, departments, and passwords', () => {
  const valid = { name: 'Staff', email: 'Staff@example.test', role: 'staff', departments: ['sewing'], active: true, password: 'test-password-123' };
  assert.equal(parseStaffInput(valid, true).email, 'staff@example.test');
  for (const patch of [{ role: 'superadmin' }, { departments: ['unknown'] }, { departments: [] }, { password: 'short' }, { active: 'true' }]) {
    assert.throws(() => parseStaffInput({ ...valid, ...patch }, true));
  }
});

test('staff accounts protect self-admin, unique emails, and scoped product writes', async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  const db = client.db(process.env.MONGODB_DB || 'vatana');
  const users = db.collection<User>(`test_staff_${new ObjectId()}`);
  const orders = db.collection<Order>(`test_scope_${new ObjectId()}`);
  const actor = new ObjectId().toString();
  try {
    const input = parseStaffInput({ name: 'Staff', email: 'staff@example.test', role: 'staff', departments: ['sewing'], active: true, password: 'test-password-123' }, true);
    await saveStaff(users, input, actor);
    await assert.rejects(saveStaff(users, input, actor));
    await assert.rejects(saveStaff(users, input, actor, actor));
    const _id = new ObjectId(), now = new Date();
    await orders.insertOne({ _id, title: 'test', reference: 'test', status: 'new', orderDate: now, createdAt: now, updatedAt: now, products: [{ styleCode: 'test', designName: 'test', productType: 'test', variants: [], status: 'sewing' }] });
    assert.equal(await recordProductChange(orders, String(_id), 0, actor, 'production', { status: 'packing' }, undefined, '', 'denied', ['printing']), false);
    assert.equal(await recordProductChange(orders, String(_id), 0, actor, 'production', { status: 'packing' }, undefined, '', 'allowed', ['sewing']), true);
    assert.equal(await recordProductChange(orders, String(_id), 0, actor, 'production', { status: 'sent' }, undefined, '', 'after-transfer', ['sewing']), false);
    assert.equal((await orders.findOne({ _id }))!.products[0].history?.length, 1);
  } finally { await users.drop(); await orders.drop(); await client.close(); }
});

test('HTTP authorization checks live roles, blocks direct APIs and other departments', async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  const users = client.db(process.env.MONGODB_DB || 'vatana').collection<User>('users');
  const _id = new ObjectId();
  const email = `access-test-${_id}@example.test`;
  const newEmail = `created-test-${_id}@example.test`;
  const cookieName = 'authjs.session-token';
  try {
    await users.insertOne({ _id, name: 'Permission test', email, passwordHash: 'disabled-test-login', role: 'staff', departments: ['sewing'], active: true, createdAt: new Date() });
    const token = await encode({ secret: process.env.AUTH_SECRET!, salt: cookieName, token: { sub: String(_id), email, name: 'Permission test', role: 'admin' } });
    const request = (path: string, method = 'GET') => fetch(`http://localhost:3003${path}`, { method, redirect: 'manual', headers: { cookie: `${cookieName}=${token}`, ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }) }, ...(method === 'GET' ? {} : { body: '{}' }) });
    for (const [path, method] of [['/api/orders', 'GET'], ['/api/staff', 'POST'], [`/api/staff/${_id}`, 'PATCH'], ['/api/uploads', 'POST'], [`/api/orders/${_id}`, 'GET'], [`/api/orders/${_id}`, 'PATCH'], [`/api/orders/${_id}/products/0/work-details`, 'PATCH']]) {
      assert.equal((await request(path, method)).status, 403, path);
    }
    assert.equal((await request('/departments/sewing')).status, 200);
    const other = await request('/departments/printing');
    // Next streaming notFound may return HTTP 200; must render not-found rather than queue.
    const otherText = await other.text();
    assert.ok(other.status === 404 || otherText.includes('NEXT_HTTP_ERROR_FALLBACK;404'));
    for (const path of ['/staff', '/orders', '/production-report']) {
      const res = await request(path); const html = await res.text();
      assert.ok(res.status === 307 || html.includes('NEXT_REDIRECT'), path);
      assert.ok(!html.includes('type="password"'), path);
    }
    await users.updateOne({ _id }, { $set: { departments: ['printing'] } });
    const revoked = await request('/departments/sewing');
    assert.ok(revoked.status === 404 || (await revoked.text()).includes('NEXT_HTTP_ERROR_FALLBACK;404'));
    await users.updateOne({ _id }, { $set: { role: 'admin' } });
    const write = (path: string, method: string, body: unknown) => fetch(`http://localhost:3003${path}`, { method, headers: { cookie: `${cookieName}=${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const input = { name: 'Created test', email: newEmail, role: 'staff', departments: ['folding'], active: true, password: 'temporary-test-password' };
    assert.equal((await write('/api/staff', 'POST', input)).status, 201);
    const created = await users.findOne({ email: newEmail });
    assert.ok(created);
    assert.ok(created.passwordHash.startsWith('$2'));
    assert.equal((await write(`/api/staff/${created._id}`, 'PATCH', { ...input, password: '', departments: ['packing'] })).status, 200);
    const updated = (await users.findOne({ _id: created._id }))!;
    assert.deepEqual(updated.departments, ['packing']);
    assert.equal(updated.passwordHash, created.passwordHash);
    assert.equal((await write(`/api/staff/${_id}`, 'PATCH', { ...input, email, active: false })).status, 400);
    await users.updateOne({ _id }, { $set: { active: false } });
    assert.equal((await request('/api/orders')).status, 401);
  } finally { await users.deleteOne({ _id }); await users.deleteOne({ email: newEmail }); await client.close(); }
});
