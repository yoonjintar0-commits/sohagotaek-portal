const test=require('node:test'),assert=require('node:assert/strict');
const ui=require('../portal-ui.js'),catalog=require('../product-catalog.js');
test('product summaries keep bread counts separate from beverage counts',()=>{
 const stats=[{p:{family:'bread'},sold:14,loss:2},{p:{family:'bread'},sold:6,loss:0},{p:{family:'drink'},sold:3,loss:1}];
 assert.deepEqual(ui.productTotals(stats),{bread:{sold:20,loss:2,count:2},drink:{sold:3,loss:1,count:1}});
 assert.deepEqual(ui.productTotals([]),{bread:{sold:0,loss:0,count:0},drink:{sold:0,loss:0,count:0}});
});
test('historical category takes precedence after a product is renamed or reclassified',()=>{
 const product={id:'tea',family:'drink',name:'청귤에이드',category:'에이드',active:false};
 assert.equal(ui.recordCategory({productCategory:'티'},product,catalog.category),'티');
 assert.equal(ui.recordCategory({},product,catalog.category),'에이드');
 assert.equal(ui.recordCategory({productName:'아메리카노'},null,catalog.category),'커피');
});
test('owner home distinguishes missing revenue from entered zero and excludes HQ or other branches',()=>{
 const common={isMaster:true,personId:100,today:'2026-10-10',sites:[{id:'soha'},{id:'coex'},{id:'hq'}],ledger:[{branch:'soha',date:'2026-10-10',sale:0,saleSample:true},{branch:'coex',date:'2026-10-10',sale:999,saleMissing:true},{branch:'hq',date:'2026-10-10',sale:999},{branch:'other',date:'2026-10-10',sale:999},{branch:'coex',date:'2026-10-09',sale:500}],photos:[{branch:'soha',date:'2026-10-10'}]};
 const result=ui.homeSummary(common);assert.equal(result.sale,0);assert.equal(result.saleEntered,1);assert.equal(result.saleExpected,2);assert.equal(result.sample,true);assert.equal(result.missingPhotos,1);
 assert.equal(ui.homeSummary({...common,ledger:[]}).saleEntered,0);
});
test('current worker counts deduplicate attendance and pending requests respect account scope',()=>{
 const data={isMaster:true,personId:100,today:'2026-10-10',sites:[{id:'soha'},{id:'hq'}],requests:[{person:100,status:'pending'},{person:101,status:'pending'},{person:100,status:'approved'}],attendance:[{person:1,branch:'soha',inAt:'yes'},{person:1,branch:'soha',inAt:'yes'},{person:2,branch:'soha',inAt:'yes',outAt:'done'},{person:3,branch:'hq',inAt:'yes'}]};
 assert.equal(ui.homeSummary(data).working,1);assert.equal(ui.homeSummary(data).pending,2);
 assert.deepEqual(ui.homeSummary({...data,isMaster:false}),{pending:1});
});
test('filter summary represents open-ended and exact-date ranges',()=>{
 assert.equal(ui.periodLabel('',''),'전체 기간');assert.equal(ui.periodLabel('2026-10-10','2026-10-10'),'2026-10-10');
 assert.equal(ui.periodLabel('','2026-10-10'),'처음 ~ 2026-10-10');assert.equal(ui.periodLabel('2026-10-01',''),'2026-10-01 ~ 오늘');
});
