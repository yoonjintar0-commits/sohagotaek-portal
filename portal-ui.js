(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SohaPortalUI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function productTotals(stats){
  const total=family=>stats.filter(r=>r.p.family===family).reduce((v,r)=>({sold:v.sold+r.sold,loss:v.loss+r.loss,count:v.count+1}),{sold:0,loss:0,count:0});
  return {bread:total('bread'),drink:total('drink')};
 }
 function recordCategory(row,product,category){return row.productCategory||category(product||{family:'drink',name:row.productName||''});}
 function homeSummary({isMaster,personId,today,sites,ledger=[],requests=[],attendance=[],photos=[]}){
  const pending=requests.filter(r=>r.status==='pending'&&(isMaster||r.person===personId)).length;
  if(!isMaster)return {pending};
  const branches=sites.filter(b=>b.id!=='hq'),ids=new Set(branches.map(b=>b.id));
  const rows=ledger.filter(r=>r.date===today&&ids.has(r.branch)&&!r.saleMissing);
  return {pending,sale:rows.reduce((sum,r)=>sum+(Number(r.sale)||0),0),saleEntered:new Set(rows.map(r=>r.branch)).size,saleExpected:branches.length,sample:rows.some(r=>r.saleSample),working:new Set(attendance.filter(a=>ids.has(a.branch)&&a.inAt&&!a.outAt).map(a=>a.person)).size,missingPhotos:branches.filter(b=>!photos.some(p=>p.branch===b.id&&p.date===today)).length};
 }
 function periodLabel(from,to){if(!from&&!to)return '전체 기간';if(from===to)return from;return (from||'처음')+' ~ '+(to||'오늘');}
 function section(form,title,ids,{optional=false}={}){
  const doc=form.ownerDocument,host=doc.createElement(optional?'details':'fieldset');host.className='s-form-section'+(optional?' s-form-optional':'');
  const heading=doc.createElement(optional?'summary':'legend');heading.textContent=title;host.append(heading);
  const grid=doc.createElement('div');grid.className='s-form-section-grid';host.append(grid);
  for(const id of ids){const control=form.querySelector('#'+id),field=control?.closest('.s-field,.s-check-row');if(field)grid.append(field);}
  return host;
 }
 function groupProfile(form){
  if(!form||form.dataset.uiGrouped)return;form.dataset.uiGrouped='true';form.classList.add('s-grouped-profile');
  const photo=form.querySelector('.s-profile-photo-field'),actions=form.querySelector('.s-form-actions'),info=form.querySelector('.s-form-info'),avatar=form.querySelector('.s-avatar-picker');
  if(photo)form.prepend(photo);
  const sections=[section(form,'기본 정보',['profile-name','profile-username','profile-phone','profile-email','profile-birthday']),section(form,'근무 정보',['profile-home','profile-job','profile-joined','profile-career','profile-cumulative','profile-left','profile-hq-member','profile-master']),section(form,'보건증',['profile-health','profile-health-issued','profile-health-due']),section(form,'기타 정보 · 선택',['profile-bank','profile-address','profile-notes'],{optional:true})];
  if(avatar)sections[3].querySelector('.s-form-section-grid').append(avatar);
  for(const group of sections)form.insertBefore(group,actions);
  if(info)form.insertBefore(info,actions);
  const username=form.querySelector('#profile-username');if(username){const hint=form.ownerDocument.createElement('small');hint.textContent='비워두면 이름과 날짜로 자동 발급됩니다.';username.after(hint);}
  const due=form.querySelector('#profile-health-due');if(due){due.closest('label').firstChild.textContent='갱신 예정일 · 자동';const hint=form.ownerDocument.createElement('small');hint.id='profile-renewal-note';hint.textContent=due.value?'발급일로부터 1년 뒤 · '+due.value:'발급일을 입력하면 1년 뒤로 계산됩니다.';due.after(hint);}
 }
 function groupSale(form){
  if(!form||form.dataset.uiGrouped)return;form.dataset.uiGrouped='true';form.classList.add('s-quick-sale');
  const loss=form.querySelector('#menu-losses')?.closest('.s-field'),doc=form.ownerDocument;
  if(loss){const details=doc.createElement('details');details.className='s-sale-details';details.id='menu-loss-details';details.open=!!loss.querySelector('.s-loss-input');const summary=doc.createElement('summary');summary.textContent='로스 사유 · 메모';loss.before(details);details.append(summary,loss);}
  const product=form.querySelector('#menu-product')?.closest('.s-field');product?.classList.add('wide');
  const sold=form.querySelector('#menu-sold');if(sold){sold.inputMode='numeric';const box=doc.createElement('div');box.className='s-field s-loss-total-field';box.innerHTML='<span>로스 수량</span><button type="button" class="s-loss-total-button" data-ui-loss-details aria-controls="menu-loss-details"><strong id="menu-loss-total">0</strong><span>사유별 입력</span></button>';sold.closest('.s-field').after(box);}
 }
 return {productTotals,recordCategory,homeSummary,periodLabel,groupProfile,groupSale};
});
