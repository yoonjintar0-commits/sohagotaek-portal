-- Apply to the current row only, preserving all operational records and stable IDs.
-- Run once after deploying catalog support; the backup trigger captures the prior state.
with current_state as (
  select id, version, payload from public.soha_state where id=true for update
), catalog as (
  select c.id, jsonb_agg(p || jsonb_build_object(
    'active', coalesce((p->>'active')::boolean,true),
    'order', case when p->>'id'='latte' then 1000 else coalesce((p->>'order')::numeric,ord-1) end,
    'category', case
      when p->>'family'='bread' then '소금찰빵'
      when p->>'name' like '%에이드%' then '에이드'
      when p->>'name' ~ '논커피|샷[xX]' then '논커피'
      when p->>'name' like '%(티)%' then '티'
      else coalesce(p->>'category','커피') end,
    'branches', case
      when p->>'family'='drink' then case when p->>'id'='latte' then '["soha","coex","jamsil"]'::jsonb else '["soha"]'::jsonb end
      when p->>'name' in ('소금','소보루','소보로','치즈','인절미','쑥','츄러스') then '["soha","coex","jamsil"]'::jsonb
      else '["coex","jamsil"]'::jsonb end
  ) order by ord) as items
  from current_state c, jsonb_array_elements(c.payload->'mainMenus') with ordinality as m(p,ord)
  group by c.id
), new_items as (
  select jsonb_build_object('id','bread-mugwort','name','쑥','fullName','소금찰빵 · 쑥','family','bread','unit','개','category','소금찰빵','branches','["soha"]'::jsonb,'active',true,'order',42) as p
  union all
  select jsonb_build_object('id','leaf-tea-'||taste.idx||'-'||lower(temperature.t),'name',taste.name||' '||temperature.t,'fullName',taste.name||' '||temperature.t,'family','drink','unit','잔','category','잎차','branches','["soha"]'::jsonb,'active',true,'order',43+taste.idx*2+temperature.idx)
  from (values (1,'히비스커스'),(2,'녹차'),(3,'딸기홍차'),(4,'파파야'),(5,'로즈힙'),(6,'사과')) as taste(idx,name), (values (0,'HOT'),(1,'ICE')) as temperature(idx,t)
), revised as (
  select c.id,c.version,jsonb_set(jsonb_set(jsonb_set(c.payload,'{mainMenus}',cat.items || coalesce((select jsonb_agg(n.p) from new_items n where not exists(select 1 from jsonb_array_elements(cat.items) m where m->>'id'=n.p->>'id')),'[]'::jsonb)),
    '{sites}',(select jsonb_agg(case when b->>'id'='coex' then b||'{"name":"무역센터점","short":"무역센터점"}'::jsonb else b end order by ord) from jsonb_array_elements(c.payload->'sites') with ordinality as s(b,ord))),
    '{staff}',(select jsonb_agg(case when p->>'healthIssued' ~ '^\d{4}-\d{2}-\d{2}$' then p||jsonb_build_object('healthDue',to_char((p->>'healthIssued')::date + interval '1 year','YYYY-MM-DD')) else p end order by ord) from jsonb_array_elements(c.payload->'staff') with ordinality as s(p,ord))) as payload
  from current_state c join catalog cat using(id)
)
update public.soha_state s set payload=r.payload,version=s.version+1,updated_at=now()
from revised r where s.id=r.id and s.version=r.version
returning s.version,jsonb_array_length(s.payload->'mainMenus') as product_count;
