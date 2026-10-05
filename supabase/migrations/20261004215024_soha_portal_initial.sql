create table if not exists public.soha_state (id boolean primary key default true check(id), version bigint not null default 1, payload jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.soha_accounts (staff_id bigint primary key, username text not null unique, password_hash text not null, must_change boolean not null default true, active boolean not null default true);
create table if not exists public.soha_sessions (token_hash text primary key, staff_id bigint not null references public.soha_accounts(staff_id), expires_at timestamptz not null, created_at timestamptz not null default now());
create index if not exists soha_sessions_expiry on public.soha_sessions(expires_at);
create table if not exists public.soha_attempts (key text primary key, failures integer not null default 0, window_at timestamptz not null default now());
alter table public.soha_state enable row level security;
alter table public.soha_accounts enable row level security;
alter table public.soha_sessions enable row level security;
alter table public.soha_attempts enable row level security;
revoke all on public.soha_state,public.soha_accounts,public.soha_sessions,public.soha_attempts from anon,authenticated;
grant all on public.soha_state,public.soha_accounts,public.soha_sessions,public.soha_attempts to service_role;
create or replace function public.soha_login(u text,p text,ip text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare a soha_accounts; k text; t text; n integer; w timestamptz;
begin
 k:=encode(digest(lower(u),'sha256'),'hex');
 insert into soha_attempts(key) values(k) on conflict do nothing;
 select failures,window_at into n,w from soha_attempts where key=k for update;
 if w < now()-interval '15 minutes' then update soha_attempts set failures=0,window_at=now() where key=k;n:=0;end if;
 if n>=5 then return jsonb_build_object('error','로그인을 여러 번 시도했습니다. 15분 후 다시 시도하세요.');end if;
 select * into a from soha_accounts where username=u and active;
 if a.staff_id is null or a.password_hash <> crypt(p,a.password_hash) then
 update soha_attempts set failures=failures+1 where key=k;
 return jsonb_build_object('error','아이디 또는 비밀번호를 확인하세요.');end if;
 update soha_attempts set failures=0 where key=k;
 t:=encode(gen_random_bytes(32),'hex');
 delete from soha_sessions where expires_at<now();
 insert into soha_sessions values(encode(digest(t,'sha256'),'hex'),a.staff_id,now()+interval '7 days',now());
 return jsonb_build_object('token',t,'person',a.staff_id,'mustChange',a.must_change);
end $$;
create or replace function public.soha_identity(t text) returns jsonb language sql security definer set search_path=public,extensions as $$
 select jsonb_build_object('person',a.staff_id,'username',a.username,'mustChange',a.must_change) from soha_sessions s join soha_accounts a using(staff_id) where s.token_hash=encode(digest(t,'sha256'),'hex') and s.expires_at>now() and a.active;
$$;
create or replace function public.soha_password(t text,p text) returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare pid bigint;
begin
 select staff_id into pid from soha_sessions where token_hash=encode(digest(t,'sha256'),'hex') and expires_at>now();
 if pid is null or length(p)<8 or length(p)>128 then return false;end if;
 update soha_accounts set password_hash=crypt(p,gen_salt('bf',10)),must_change=false where staff_id=pid;
 delete from soha_sessions where staff_id=pid and token_hash<>encode(digest(t,'sha256'),'hex');
 return true;
end $$;
create or replace function public.soha_write(v bigint,d jsonb) returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare nv bigint; p jsonb;
begin
 update soha_state set payload=d,version=version+1,updated_at=now() where id=true and version=v returning version into nv;
 if nv is null then return null;end if;
 for p in select value from jsonb_array_elements(d->'staff') loop
 if exists(select 1 from soha_accounts where staff_id=(p->>'id')::bigint) then
 update soha_accounts set username=p->>'username',active=(p->>'active')::boolean where staff_id=(p->>'id')::bigint;
 else
 insert into soha_accounts(staff_id,username,password_hash,active) values((p->>'id')::bigint,p->>'username',crypt('1111',gen_salt('bf',10)),(p->>'active')::boolean);
 end if;
 end loop;
 return nv;
end $$;
revoke all on function public.soha_login(text,text,text),public.soha_identity(text),public.soha_password(text,text),public.soha_write(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.soha_login(text,text,text),public.soha_identity(text),public.soha_password(text,text),public.soha_write(bigint,jsonb) to service_role;
