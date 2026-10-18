import assert from 'node:assert/strict';import {test} from 'node:test';import {readFileSync} from 'node:fs';import {ALL_SIZES,CHILD_SIZES,SIZES,emptySizeInputs} from '../src/lib/order-sizes';import * as order from '../src/types/order';
test('runtime size module initializes every form slot independently and keeps compatibility exports identical',()=>{
 assert.deepEqual(ALL_SIZES,['XS','S','M','L','XL','XXL']);assert.deepEqual(CHILD_SIZES,['S','M','L','XL','XXL']);assert.deepEqual(SIZES,['XS','S','M','L','XL']);assert.equal(order.ALL_SIZES,ALL_SIZES);assert.equal(order.SIZES,SIZES);
 const a=emptySizeInputs(),b=emptySizeInputs();assert.deepEqual(Object.keys(a),ALL_SIZES);assert.equal(a.XXL,'');a.S='42';assert.equal(b.S,'');
});
test('size definitions have no runtime dependencies and form initializes through the runtime module',()=>{
 const leaf=readFileSync(new URL('../src/lib/order-sizes.ts',import.meta.url),'utf8');assert.ok(!/^import\s/m.test(leaf));
 const form=readFileSync(new URL('../src/components/NewOrderDialog.tsx',import.meta.url),'utf8');assert.match(form,/emptySizeInputs.*from "@\/lib\/order-sizes"/);assert.ok(!form.includes('ALL_SIZES.reduce((acc, s)'));
});
