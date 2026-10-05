-- Rename the existing branch without changing IDs, staff, schedules, or records.
-- Lock and use the latest payload; concurrent browser saves receive a version conflict.
do $$
declare previous jsonb; revised jsonb; old_version bigint; saved_version bigint;
begin
 select payload,version into previous,old_version from public.soha_state where id=true for update;
 if not exists(select 1 from jsonb_array_elements(previous->'sites') s where s->>'id'='soha') then
  raise exception 'Existing soha branch is missing';
 end if;
 revised:=jsonb_set(previous,'{sites}',(select jsonb_agg(case when s->>'id'='soha' then s||jsonb_build_object('name','광명점','short','광명점') else s end order by ordinal) from jsonb_array_elements(previous->'sites') with ordinality as branches(s,ordinal)));
 if revised=previous then return;end if;
 if revised-'sites'<>previous-'sites' then raise exception 'Unrelated data changed';end if;
 saved_version:=public.soha_write(old_version,revised);
 if saved_version is null then raise exception 'Concurrent save; nothing updated';end if;
end $$;
