const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const catalog=require('../product-catalog.js'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/soha-api/index.ts'),'utf8').replace(/^import .*\n/,''));
const fixed=Date.parse('2026-10-10T03:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
function fixture(){
 let handler,version=1,writes=0;
 let data={staff:[{id:100,name:'강선주',username:'master',active:true,home:'soha'},{id:101,name:'직원',username:'staff',active:true,home:'coex'}],sites:[{id:'soha'},{id:'coex'},{id:'jamsil'},{id:'hq'}],mainMenus:[{id:'latte',name:'콩고물 라떼',fullName:'콩고물 라떼',family:'drink',unit:'잔',branches:['soha','coex','jamsil'],category:'커피'},{id:'coffee',name:'아메리카노ICE',family:'drink',unit:'잔',branches:['soha'],category:'커피'}],shifts:[],menuLogs:[],inventoryMoves:[],attendanceLogs:[],branchPhotos:[],requests:[],dailyLedger:[],records:[],movesLog:[]};
 const db={from(){return {select(){return {eq(){return {single:async()=>({data:{version,payload:structuredClone(data)}})}}}}};},async rpc(name,args){if(name==='soha_identity')return {data:args.t==='master'?{person:100}:args.t==='staff'?{person:101}:null};assert.equal(name,'soha_write');if(args.v!==version)return {data:null};writes++;data=structuredClone(args.d);return {data:++version};}};
 vm.runInNewContext(source,{createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Date:Clock,Intl,Response,Request,TextEncoder,structuredClone,crypto:globalThis.crypto,console:{error(){}}});
 return {get data(){return data;},get version(){return version;},get writes(){return writes;},async call(body,token='master'){const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}};
}
const log=(product='latte',branch='coex')=>({id:1,date:'2026-10-10',branch,product,sold:2,losses:[],creator:101});
test('each branch shows only its active products, with six Gwangmyeong bread flavors',()=>{
 const menus=['소금','소보로','치즈','인절미','쑥','츄러스','감자','올리브'].map((name,i)=>({id:'b'+i,name,family:'bread'}));
 menus.push({id:'coffee',name:'커피',family:'drink'},{id:'latte',name:'콩고물 라떼',family:'drink'},{id:'old',name:'판매중단',family:'drink',active:false});
 assert.deepEqual(catalog.visible(menus,['soha']).filter(p=>p.family==='bread').map(p=>p.name),['소금','소보로','치즈','인절미','쑥','츄러스']);
 assert.deepEqual(catalog.visible(menus,['coex']).filter(p=>p.family==='drink').map(p=>p.id),['latte']);
 assert.equal(catalog.visible(menus,['hq']).length,0);
});
test('category and stable order distinguish coffee, decaf drinks, tea, ade, and rotating leaf tea',()=>{
 for(const [name,expected] of [['아메리카노HOT','커피'],['제주녹차라떼 (논커피)','논커피'],['콩고물라떼-샷x','논커피'],['청귤차HOT (티)','티'],['청귤에이드 (티)','에이드'],['히비스커스 HOT','잎차']])assert.equal(catalog.category({name,family:'drink',...(expected==='잎차'?{category:'잎차'}:{})}),expected);
 assert.deepEqual(catalog.visible([{id:'latte',family:'drink',order:3},{id:'a',family:'drink',order:1},{id:'b',family:'drink',order:2}],['soha']).map(p=>p.id),['a','b','latte']);
});
test('server rejects a forged sale for a product not sold at that branch',async()=>{
 for(const token of ['master','staff']){const f=fixture(),data=structuredClone(f.data);data.menuLogs.push(log('coffee'));const r=await f.call({action:'save',version:f.version,data},token);assert.equal(r.status,400);assert.equal(f.writes,0);}
 const f=fixture(),data=structuredClone(f.data);data.menuLogs.push(log());assert.equal((await f.call({action:'save',version:f.version,data},'staff')).status,200);assert.equal(f.data.menuLogs[0].productName,'콩고물 라떼');
});
test('archive and rename retain history, permit existing record corrections, and block new archived sales',async()=>{
 const f=fixture();f.data.menuLogs.push(log());let data=structuredClone(f.data);data.mainMenus[0].name='새 이름';data.mainMenus[0].fullName='새 이름';data.mainMenus[0].active=false;data.menuLogs[0].productName='콩고물 라떼';assert.equal((await f.call({action:'save',version:f.version,data})).status,200);assert.equal(f.data.menuLogs[0].productName,'콩고물 라떼');
 data=structuredClone(f.data);data.menuLogs[0].sold=5;assert.equal((await f.call({action:'save',version:f.version,data},'staff')).status,200);
 data=structuredClone(f.data);data.menuLogs.push({...log(),id:2});assert.equal((await f.call({action:'save',version:f.version,data},'staff')).status,400);
 data=structuredClone(f.data);data.mainMenus.shift();assert.equal((await f.call({action:'save',version:f.version,data})).status,400);
});
test('renewal date is computed on registration and settings, including leap day and cleared dates',async()=>{
 for(const [issued,due] of [['2026-10-08','2027-10-08'],['2024-02-29','2025-02-28'],['',''],['2026-02-30','']])assert.equal(catalog.renewalDate(issued),due);
 const f=fixture();assert.equal((await f.call({action:'settings',profile:{healthIssued:'2024-02-29',healthDue:'2099-01-01'}},'staff')).status,200);assert.equal(f.data.staff[1].healthDue,'2025-02-28');
 const data=structuredClone(f.data);data.staff[0].healthIssued='2026-10-08';data.staff[0].healthDue='';assert.equal((await f.call({action:'save',version:f.version,data})).status,200);assert.equal(f.data.staff[0].healthDue,'2027-10-08');
 assert.equal((await f.call({action:'settings',profile:{healthIssued:'invalid'}},'staff')).status,400);
});
test('employee photos accept bounded JPEG data and reject URLs, markup, and oversized payloads',async()=>{
 const photo='data:image/jpeg;base64,/9j/AA==';assert.ok(catalog.photoValid(photo));
 for(const value of ['https://example.com/photo.jpg',"x');color:red;/*",'data:image/svg+xml;base64,AA==','data:image/jpeg;base64,'+'A'.repeat(120001)]){assert.equal(catalog.photoValid(value),false);const f=fixture(),data=structuredClone(f.data);data.staff[0].profilePhoto=value;assert.equal((await f.call({action:'save',version:f.version,data})).status,400);assert.equal(f.writes,0);}
 const f=fixture(),data=structuredClone(f.data);data.staff[0].profilePhoto=photo;assert.equal((await f.call({action:'save',version:f.version,data})).status,200);assert.equal((await f.call({action:'get'},'staff')).data.data.staff[0].profilePhoto,photo);assert.equal((await f.call({action:'get'},'staff')).data.data.staff[0].healthIssued,undefined);
});
