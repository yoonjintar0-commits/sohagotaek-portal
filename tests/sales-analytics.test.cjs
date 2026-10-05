const {test}=require('node:test');
const assert=require('node:assert/strict');
const a=require('../sales-analytics.js');
test('cumulative hours truncate the final sum, without rounding individual records',()=>{
 assert.equal(a.integerHours(1.9+1.9),3);
 assert.equal(a.integerHours(29.999),29);
 assert.equal(a.integerHours('12.8'),12);
 assert.equal(a.integerHours(NaN),0);
});
test('daily sales aggregate stores, keep zero sales, and exclude HQ, missing sales and future dates',()=>{
 const rows=[{date:'2026-10-01',branch:'a',sale:100},{date:'2026-10-01',branch:'b',sale:200},{date:'2026-10-02',branch:'a',sale:0},{date:'2026-10-02',branch:'b',sale:900,saleMissing:true},{date:'2026-10-01',branch:'hq',sale:999},{date:'2026-10-06',branch:'a',sale:999}];
 const days=a.salesDays(rows,'2026-10-05');
 assert.deepEqual(days.map(d=>[d.date,d.sale]),[['2026-10-01',300],['2026-10-02',0]]);
});
test('holiday ratio uses unrounded daily means and handles zero/missing baselines',()=>{
 const days=[{date:'weekday1',sale:1},{date:'weekday2',sale:2},{date:'holiday',sale:1}];
 const stats=a.holidayComparison(days,d=>d==='holiday');
 assert.equal(stats.weekday.mean,1.5);assert.equal(stats.weekday.n,2);assert.equal(stats.holiday.n,1);
 assert.ok(Math.abs(stats.ratio-100/1.5)<1e-10);
 assert.equal(a.holidayComparison([{date:'weekday',sale:0},{date:'holiday',sale:2}],d=>d==='holiday').ratio,null);
 assert.equal(a.holidayComparison([{date:'weekday',sale:2}],()=>false).ratio,null);
 assert.equal(a.holidayComparison([{date:'weekday',sale:2},{date:'holiday',sale:0}],d=>d==='holiday').ratio,0);
});
test('temperature bands include their lower bound, preserve 0°C, and exclude null/missing weather',()=>{
 const values=[-1,0,5,10,15,20,25,30,null,undefined];
 const rows=values.map((_,i)=>({date:'2026-10-'+String(i+1).padStart(2,'0'),branch:'a',sale:(i+1)*100}));
 const cache=Object.fromEntries(values.map((t,i)=>['a|'+rows[i].date,{meanTemperature:t}]));
 const result=a.temperatureGroups(rows,cache,'2026-10-10');
 assert.deepEqual(result.groups.map(g=>g.n),[1,1,1,1,1,1,1,1]);assert.equal(result.missing,2);
 assert.equal(result.groups[1].mean,200);assert.equal(result.groups[7].mean,800);
});
test('all-store comparisons use total daily sales and equal-store mean temperature; incomplete days are excluded',()=>{
 const rows=[{date:'2026-10-01',branch:'a',sale:100},{date:'2026-10-01',branch:'b',sale:900},{date:'2026-10-02',branch:'a',sale:200},{date:'2026-10-02',branch:'b',sale:800}];
 const cache={'a|2026-10-01':{meanTemperature:14},'b|2026-10-01':{meanTemperature:18},'a|2026-10-02':{meanTemperature:20}};
 const result=a.temperatureGroups(rows,cache,'2026-10-02');
 assert.equal(result.groups[4].mean,1000);assert.equal(result.groups[4].n,1);assert.equal(result.groups[4].days[0].temperature,16);assert.equal(result.missing,1);
});
