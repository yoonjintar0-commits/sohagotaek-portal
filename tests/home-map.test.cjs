const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const start=html.indexOf('function drawHomeMap(){'),end=html.indexOf('\nfunction selectRoadmapBranchV14',start);
assert.ok(start>=0&&end>start);
function render(width,selection){
 const sites=[{id:'soha',name:'광명점',coords:[70,400],status:'open'},{id:'coex',name:'무역센터점',coords:[220,400],status:'open'},{id:'jamsil',name:'잠실 팝업점',coords:[220,400],status:'prep'}];
 const nodes=[],houses={innerHTML:''},map={clientWidth:width,style:{},getBoundingClientRect:()=>({left:0,top:0})};
 function element(tag){const node={tag,attrs:{},attr(name,value){this.attrs[name]=value;return this},append(tag){const child=element(tag);nodes.push(child);return child},text(){return this},selectAll(){return element('selection')},data(){return this},join(){return this},remove(){return this},each(){return this}};return node}
 const svg=element('svg'),cards=sites.map(b=>({dataset:{liveCallout:b.id},style:{},offsetHeight:b.id==='coex'?250:150,querySelector:()=>({dataset:{}})}));
 const projection=coords=>coords;projection.fitExtent=()=>projection;
 const path=()=>'';path.centroid=()=>[0,0];
 const context={esc:String,view:'home',homeSelection:selection,homeMapSites:()=>sites,geometry:{features:[]},shifts:[{id:55,branch:'coex'}],q:selector=>({'#soha-home-map':map,'#soha-home-map-svg':svg,'#soha-home-houses':houses}[selector]),qa:()=>cards,d3:{geoMercator:()=>projection,geoPath:()=>path,select:()=>svg},positionHomePopup:()=>{}};
 vm.runInNewContext(html.slice(start,end)+'\ndrawHomeMap();',context);
 return {nodes,houses:houses.innerHTML};
}
test('nearby map locations never draw a connector between displaced store icons',()=>{
 for(const width of [320,390,1024]){
  const {nodes,houses}=render(width,{kind:'site',id:'jamsil'});
  assert.equal(nodes.filter(n=>n.tag==='line').length,0);
  const guides=nodes.filter(n=>n.tag==='path'&&n.attrs['data-home-guide']);
  assert.deepEqual(guides.map(n=>n.attrs['data-home-guide']),['jamsil']);
  const marker=id=>houses.match(new RegExp('left:([\\d.]+)px;top:([\\d.]+)px[^>]+data-house-branch="'+id+'"'));
  const coex=marker('coex'),jamsil=marker('jamsil');
  assert.ok(coex&&jamsil);assert.notEqual(coex[1]+','+coex[2],jamsil[1]+','+jamsil[2]);
  assert.ok(guides[0].attrs.d.endsWith(jamsil[1]+','+(Number(jamsil[2])-21)));
 }
});
test('worker selection links only its own branch and clearing selection removes the guide',()=>{
 const selected=render(390,{kind:'shift',id:55}).nodes.filter(n=>n.attrs['data-home-guide']);
 assert.deepEqual(selected.map(n=>n.attrs['data-home-guide']),['coex']);
 assert.equal(render(390,{kind:'',id:null}).nodes.filter(n=>n.attrs['data-home-guide']).length,0);
});
