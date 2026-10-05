const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),box={};
vm.runInNewContext(html.match(/^function staffAvatarSourceV9\(p\).*$/m)[0],box);
const expected={105:'kim-youngchae',107:'kim-bomi',108:'no-yuna',109:'kim-minjung',111:'nam-jimin',112:'choi-jihyun',114:'hwang-jihyun',507:'kim-minseo',508:'jo-heeyeon'};
test('each photograph maps to a distinct stable employee ID, not a generic avatar slot',()=>{
  const sources=new Set();
  for(const [id,name] of Object.entries(expected)){
    const src=box.staffAvatarSourceV9({id:Number(id),avatarSlot:0});
    assert.equal(src,`assets/staff/${name}-v10.webp`);sources.add(src);
    assert.equal(box.staffAvatarSourceV9({id:Number(id),avatarSlot:8}),src);
    assert.equal(box.staffAvatarSourceV9({id:Number(id),avatarImage:`assets/staff/${name}-v9.webp`}),src,'stored older portraits must resolve to the current character');
  }
  assert.equal(sources.size,9);
});
test('staff without supplied photos always receive the neutral placeholder',()=>{
  for(const id of [100,101,102,103,104,106,110,113,999])for(const avatarSlot of [0,4,8])
    assert.equal(box.staffAvatarSourceV9({id,avatarSlot}),'assets/staff/default-v9.svg');
  assert.equal(box.staffAvatarSourceV9({}),'assets/staff/default-v9.svg');
  assert.equal(box.staffAvatarSourceV9({id:100,avatarImage:'assets/staff/kim-bomi-v9.webp'}),'assets/staff/default-v9.svg');
});
test('avatar metadata cannot inject remote URLs or CSS',()=>{
  for(const avatarImage of ['https://example.com/a.png',"x');color:red;/*",'assets/staff/../../bad.webp','javascript:alert(1)'])
    assert.equal(box.staffAvatarSourceV9({id:100,avatarImage}),'assets/staff/default-v9.svg');
});
test('all nine generated project assets exist as WebP and the default SVG exists',()=>{
  for(const name of Object.values(expected)){
    const file=fs.readFileSync(path.join(root,'assets','staff',name+'-v10.webp'));
    assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');
    assert.ok(file.length<150000,'avatar must stay lightweight');
  }
  assert.match(fs.readFileSync(path.join(root,'assets','staff','default-v9.svg'),'utf8'),/<svg/);
});
