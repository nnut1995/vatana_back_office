import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sizeColumns,sizeLabel,CHILD_SIZE_NUMBERS} from '../src/lib/size-columns';
import {parseVariants} from '../src/lib/product-variants';
import {orderSheetHtml} from '../src/lib/order-sheet-html';
import {variantTotal,orderTotal,type SerializedOrder,type OrderProduct} from '../src/types/order';
const adult:OrderProduct={styleCode:'ADULT',designName:'Adult',productType:'ผู้ใหญ่-ผ้าตัว',variants:[{color:'BLACK',sizes:{XS:5,S:10,M:15,L:20,XL:25}}]};
const child:OrderProduct={styleCode:'KIDS',designName:'Kids',productType:'เสื้อเด็ก',variants:[{color:'RED',sizes:{XS:0,S:4,M:6,L:8,XL:10,XXL:12}}]};
const order=(products:OrderProduct[]):SerializedOrder=>({_id:'test',title:'Mixed sizes',reference:'TEST',orderDate:'2026-01-16',createdAt:'2026-01-16',updatedAt:'2026-01-16',status:'new',products});
test('reference child headings are paired size labels, not ages or measurements',()=>{
 assert.deepEqual(CHILD_SIZE_NUMBERS,{S:4,M:6,L:8,XL:10,XXL:12});assert.deepEqual(sizeColumns(child),['S','M','L','XL','XXL']);assert.equal(sizeLabel(child,'XXL'),'XXL / 12');assert.equal(sizeLabel(child,'S'),'S / 4');
 assert.deepEqual(sizeColumns(adult),['XS','S','M','L','XL']);assert.equal(sizeLabel(adult,'S'),'S');
});
test('XXL validates and contributes to child and mixed totals without changing old variants',()=>{
 assert.equal(variantTotal(child.variants[0]),40);assert.equal(orderTotal(order([adult,child])),115);assert.deepEqual(parseVariants(adult.variants),adult.variants);assert.deepEqual(parseVariants(child.variants),child.variants);
 for(const XXL of [-1,0.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>parseVariants([{color:'RED',sizes:{...child.variants[0].sizes,XXL}}]));
});
test('shirt-type changes expose historical off-scheme quantities rather than losing them',()=>{
 assert.deepEqual(sizeColumns({...child,productType:'เสื้อผู้ใหญ่'}),['XS','S','M','L','XL','XXL']);assert.deepEqual(sizeColumns({...adult,productType:'เสื้อเด็ก'}),['XS','S','M','L','XL','XXL']);
});
test('child, adult and mixed PDFs print the reference labels with complete totals',()=>{
 const c=orderSheetHtml(order([child]));for(const [s,n] of Object.entries(CHILD_SIZE_NUMBERS))assert.ok(c.includes(`${s}<br>${n}</th>`));assert.ok(!c.includes('XS</th>'));assert.ok(c.includes('>40</td>'));
 const a=orderSheetHtml(order([adult]));assert.ok(a.includes('XS</th>'));assert.ok(!a.includes('XXL</th>'));assert.ok(!a.includes('S<br>4'));
 const mixed=orderSheetHtml(order([adult,child]));assert.ok(mixed.includes('XXL<br>12'));assert.ok(mixed.includes('>115</td>'));assert.ok(mixed.includes('total-size">XXL'));
});
