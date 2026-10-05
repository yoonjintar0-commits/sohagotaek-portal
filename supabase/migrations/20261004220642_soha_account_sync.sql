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