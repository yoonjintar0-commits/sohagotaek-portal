const {test}=require('node:test');
const assert=require('node:assert/strict');
const {merge,copy,equal}=require('../sync-state.js');
const initial=()=>({staff:[{id:1,name:'A',phone:'old',email:'old'}],inventoryMoves:[],attendanceLogs:[],branchPhotos:[],requests:[]});
test('independent fields and new rows survive concurrent saves',()=>{
  const base=initial(),local=copy(base),remote=copy(base);
  local.staff[0].phone='mine';remote.staff[0].email='theirs';
  local.inventoryMoves.push({id:1,qty:3});remote.inventoryMoves.push({id:2,qty:4});
  remote.attendanceLogs.push({id:'punch',person:1});
  const r=merge(base,local,remote);
  assert.deepEqual(r.conflicts,[]);assert.equal(r.data.staff[0].phone,'mine');assert.equal(r.data.staff[0].email,'theirs');
  assert.deepEqual(r.data.inventoryMoves.map(x=>x.id),[2,1]);assert.deepEqual(r.data.attendanceLogs,remote.attendanceLogs);
});
test('a same-field conflict preserves both choices and independent changes',()=>{
  const base=initial(),local=copy(base),remote=copy(base);
  local.staff[0].phone='mine';remote.staff[0].phone='theirs';remote.staff[0].email='new';
  const r=merge(base,local,remote);assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].local,'mine');assert.equal(r.conflicts[0].remote,'theirs');
  assert.equal(r.data.staff[0].phone,'mine');const chosen=merge(base,local,remote,'remote');assert.equal(chosen.data.staff[0].phone,'theirs');assert.equal(chosen.data.staff[0].email,'new');
});
test('delete/edit races and colliding IDs never silently merge',()=>{
  const base=initial(),local=copy(base),remote=copy(base);local.staff=[];remote.staff[0].name='updated';
  assert.equal(merge(base,local,remote).conflicts.length,1);
  local.inventoryMoves.push({id:1,qty:3});remote.inventoryMoves.push({id:1,qty:4});
  const r=merge(base,local,remote);assert.equal(r.conflicts.length,2);assert.equal(r.data.inventoryMoves[0].qty,3);
});
test('JSON object key order does not create false edits',()=>{
  assert.equal(equal({a:1,b:2},{b:2,a:1}),true);const base=initial(),local=copy(base),remote=copy(base);remote.staff[0]={email:'old',phone:'old',name:'A',id:1};
  assert.deepEqual(merge(base,local,remote).conflicts,[]);
});
test('edits made during a save remain pending after acknowledgment',()=>{
  const sent=initial(),current=copy(sent),ack=copy(sent);current.staff[0].phone='typed while saving';ack.staff[0].email='canonical server value';
  const r=merge(sent,current,ack);assert.equal(r.data.staff[0].phone,'typed while saving');assert.equal(r.data.staff[0].email,'canonical server value');assert.deepEqual(r.conflicts,[]);
});
