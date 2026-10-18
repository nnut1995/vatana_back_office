import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ObjectId,type Collection} from 'mongodb';
import {parseArtworks,artworkSlots} from '../src/lib/artworks';
import {productTypeValue,legacyProductType} from '../src/lib/product-type';
import {parseWorkSpecification,emptyWorkDetails} from '../src/lib/work-details';
import {recordProductChange} from '../src/lib/product-history';
import {orderSheetHtml} from '../src/lib/order-sheet-html';
import type {Order,OrderProduct,SerializedOrder,ProductHistoryEntry} from '../src/types/order';

test('shirt type preserves canonical choice, falls back to legacy and flags genuine conflicting values',()=>{
 assert.equal(productTypeValue({productType:'  เสื้อผู้ใหญ่  ',fabricType:'ผู้ใหญ่-ผ้าตัว'}),'เสื้อผู้ใหญ่');
 assert.equal(legacyProductType({productType:'เสื้อผู้ใหญ่',fabricType:'ผู้ใหญ่-ผ้าตัว'}),'ผู้ใหญ่-ผ้าตัว');
 assert.equal(productTypeValue({productType:' ',fabricType:'ผู้ใหญ่-ผ้าตัว'}),'ผู้ใหญ่-ผ้าตัว');
 assert.equal(legacyProductType({fabricType:'ผู้ใหญ่-ผ้าตัว'}),undefined);
 assert.equal(legacyProductType({productType:' เสื้อผู้ใหญ่ ',fabricType:'เสื้อผู้ใหญ่'}),undefined);
});
test('artwork slots preserve custom captions and images and validate replacement/removal payloads',()=>{
 const art={caption:'  Print On ใหม่  ',imageKey:'products/new.webp'};
 assert.deepEqual(parseArtworks([art]),[{...art,caption:'Print On ใหม่'}]);
 assert.equal(artworkSlots([art])[0].imageKey,'products/new.webp');assert.equal(artworkSlots([art]).length,3);
 assert.deepEqual(parseArtworks([]),[]);
 assert.deepEqual(parseArtworks([{caption:'Print On'}]),[{caption:'Print On'}]);
 for(const invalid of [null,{},Array(4).fill(art),[{caption:'x'.repeat(121)}],[{caption:'x',imageKey:'../../private'}],[{caption:'x',imageUrl:'javascript:alert(1)'}]])assert.equal(parseArtworks(invalid),null);
});
test('old work-detail clients omit artworks without clearing them; explicit arrays support full edits',()=>{
 const details=emptyWorkDetails();assert.deepEqual(parseWorkSpecification(details),details);
 assert.deepEqual(parseWorkSpecification({...details,artworks:[]}),{...details,artworks:[]});
 assert.equal(parseWorkSpecification({...details,artworks:[{caption:100}]}),null);
});
function capture(product:OrderProduct){let updates:Record<string,unknown>={};const collection={findOne:async()=>({products:[product]}),updateOne:async(_filter:unknown,changes:Record<string,unknown>)=>{updates=changes;return{matchedCount:1};}} as unknown as Collection<Order>;return{collection,read:()=>updates};}
test('artwork edits retain old captions/photos in the same atomic work-details audit entry',async()=>{
 const old=[{caption:'Print On เดิม',imageKey:'products/old.webp'}];const next=[{caption:'Print On ใหม่',imageKey:'products/new.webp'}];
 const test=capture({styleCode:'TEST',designName:'Test',productType:'เสื้อผู้ใหญ่',variants:[],artworks:old});
 await recordProductChange(test.collection,String(new ObjectId()),0,'admin','work_details',{artworks:next},undefined,'','request-artwork-123');
 const set=test.read().$set as Record<string,unknown>;assert.deepEqual(set['products.0.artworks'],next);assert.ok(!Object.hasOwn(set,'products.0.variants'));
 const entry=(test.read().$push as Record<string,ProductHistoryEntry>)['products.0.history'];assert.deepEqual(entry.before.artworks,old);assert.deepEqual(entry.after.artworks,next);
});
test('explicit shirt-type edits synchronize the old alias and audit both previous values',async()=>{
 const test=capture({styleCode:'TEST',designName:'Test',productType:'เสื้อผู้ใหญ่',fabricType:'ผู้ใหญ่-ผ้าตัว',variants:[]});
 await recordProductChange(test.collection,String(new ObjectId()),0,'admin','product_type',{productType:'ผู้ใหญ่-ผ้าชิ้น'});
 const set=test.read().$set as Record<string,unknown>;assert.equal(set['products.0.productType'],'ผู้ใหญ่-ผ้าชิ้น');assert.equal(set['products.0.fabricType'],'ผู้ใหญ่-ผ้าชิ้น');
 const entry=(test.read().$push as Record<string,ProductHistoryEntry>)['products.0.history'];assert.equal(entry.before.productType,'เสื้อผู้ใหญ่');assert.equal(entry.before.fabricType,'ผู้ใหญ่-ผ้าตัว');
});
test('PDF uses only shirt-type labels, shows retained legacy context and reflects edited artwork text',()=>{
 const order:SerializedOrder={_id:'test',title:'Test',reference:'Test',orderDate:'2026-01-16',createdAt:'2026-01-16',updatedAt:'2026-01-16',status:'new',products:[{styleCode:'TEST',designName:'Test',productType:'เสื้อผู้ใหญ่',fabricType:'ผู้ใหญ่-ผ้าตัว',variants:[],artworks:[{caption:'Print On ใหม่',imageKey:'products/new.webp'},{caption:'ป้ายที่ไม่มีรูป'}]}]};
 const html=orderSheetHtml(order,()=> 'data:image/webp;base64,AA==');assert.ok(html.includes('ประเภทเสื้อ'));assert.ok(!html.includes('ประเภทผ้า'));assert.ok(html.includes('ผู้ใหญ่-ผ้าตัว'));assert.ok(html.includes('Print On ใหม่'));assert.ok(html.includes('ป้ายที่ไม่มีรูป'));
});

test("historical Mongo null image aliases normalize to absent uploads", () => {
  assert.deepEqual(parseArtworks([{ caption: "Label", imageKey: null, imageUrl: null }]), [{ caption: "Label" }]);
});
