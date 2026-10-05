-- One-time, user-authorized roster reconciliation. Run only after assets are ready.
-- Existing real schedules, attendance, personal information and passwords are kept.
-- The state backup trigger preserves the previous roster for recovery.
begin;
set local statement_timeout = '10s';
set local lock_timeout = '3s';
do $roster$
declare
  d jsonb;
  previous jsonb;
  v bigint;
  nv bigint;
  roster jsonb := '[
    {"id":105,"name":"김영채","home":"coex","asset":"kim-youngchae"},
    {"id":107,"name":"김보미","home":"coex","asset":"kim-bomi"},
    {"id":108,"name":"노윤아","home":"coex","asset":"no-yuna"},
    {"id":109,"name":"김민정","home":"coex","asset":"kim-minjung"},
    {"id":111,"name":"남지민","home":"coex","asset":"nam-jimin"},
    {"id":112,"name":"최지현","home":"coex","asset":"choi-jihyun"},
    {"id":114,"name":"황지현","home":"soha","asset":"hwang-jihyun"},
    {"id":507,"name":"김민서","home":"soha","asset":"kim-minseo"},
    {"id":508,"name":"조희연","home":"soha","asset":"jo-heeyeon"}
  ]';
begin
  select payload,version into d,v from public.soha_state where id=true for update;
  if v <> 14 then raise exception 'Roster version changed; inspect fresh state before applying'; end if;
  previous := d;
  if (select count(*) from jsonb_array_elements(d->'staff') p where p->>'example'='true' and (p->>'id')::int between 501 and 506) <> 6 then
    raise exception 'Expected example roster does not match';
  end if;
  if exists(select 1 from jsonb_array_elements(d->'staff') p where p->>'example'='true' and (p->>'id')::int not between 501 and 506) then
    raise exception 'Unexpected example employees need review';
  end if;
  if exists(select 1 from jsonb_array_elements(roster) r left join lateral
      (select p from jsonb_array_elements(d->'staff') p where p->>'id'=r->>'id') x on true
      where (r->>'id')::int < 500 and (x.p is null or x.p->>'name'<>r->>'name')) then
    raise exception 'Real employee ID/name mismatch';
  end if;
  if exists(select 1 from public.soha_accounts where staff_id in(507,508) or username in('김민서20261005','조희연20261005')) then
    raise exception 'New account identifier is already used';
  end if;
  if exists(select 1 from jsonb_array_elements(d->'attendanceLogs') a
      where (a->>'person')::int between 501 and 506 and coalesce(a->>'sample','false')<>'true') then
    raise exception 'Example employee has non-sample attendance; preserve it for review';
  end if;
  d := jsonb_set(d,'{staff}',(select jsonb_agg(
    p || jsonb_build_object('avatarImage',coalesce('assets/staff/'||(r->>'asset')||'-v9.webp','assets/staff/default-v9.svg')) ||
    case when r is null then '{}'::jsonb else jsonb_build_object('home',r->>'home') end
    order by n)
    from jsonb_array_elements(d->'staff') with ordinality e(p,n)
    left join lateral (select value as r from jsonb_array_elements(roster) where value->>'id'=p->>'id') m on true
    where coalesce(p->>'example','false')<>'true'));
  d := jsonb_set(d,'{staff}',d->'staff'||(select jsonb_agg(jsonb_build_object(
    'id',(r->>'id')::int,'name',r->>'name','home',r->>'home',
    'username',(r->>'name')||'20261005','avatarImage','assets/staff/'||(r->>'asset')||'-v9.webp',
    'active',true,'mustChange',true,'moves','[]'::jsonb,'joined','','left','',
    'role','직책 미등록','job','직책 미등록','source','직원 사진 명단',
    'initialCareerMonths',0,'careerBaseDate','2026-10-05','cumulativeHours',0,
    'healthStatus','미확인','healthIssued','','healthDue','','finance',false,'write',false))
    from jsonb_array_elements(roster) r where (r->>'id')::int in(507,508)));
  d := jsonb_set(d,'{shifts}',(select coalesce(jsonb_agg(a order by n),'[]'::jsonb)
    from jsonb_array_elements(d->'shifts') with ordinality e(a,n) where (a->>'person')::int not between 501 and 506));
  d := jsonb_set(d,'{attendanceLogs}',(select coalesce(jsonb_agg(a order by n),'[]'::jsonb)
    from jsonb_array_elements(d->'attendanceLogs') with ordinality e(a,n) where (a->>'person')::int not between 501 and 506));
  if (previous - 'staff' - 'shifts' - 'attendanceLogs') is distinct from (d - 'staff' - 'shifts' - 'attendanceLogs') then
    raise exception 'Unrelated operational data changed';
  end if;
  if (select count(*) from jsonb_array_elements(d->'staff'))<>17 or
     (select count(*) from jsonb_array_elements(d->'shifts'))<>227 or
     (select count(*) from jsonb_array_elements(d->'attendanceLogs'))<>31 then
    raise exception 'Unexpected roster or record counts';
  end if;
  nv := public.soha_write(v,d);
  if nv is null then raise exception 'Concurrent write; no changes applied'; end if;
  update public.soha_accounts set active=false where staff_id between 501 and 506;
  if not exists(select 1 from public.soha_state_backups where version=v and payload=previous-'branchPhotos') then
    raise exception 'Previous state backup was not preserved';
  end if;
end;
$roster$;
commit;
