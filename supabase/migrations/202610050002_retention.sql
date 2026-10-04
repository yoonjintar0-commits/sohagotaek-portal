create extension if not exists pg_cron with schema pg_catalog;
create or replace function public.soha_prune_photos() returns void language plpgsql security definer set search_path=public as $$
begin
 update soha_state set payload=jsonb_set(payload,'{branchPhotos}',coalesce((select jsonb_agg(x) from jsonb_array_elements(payload->'branchPhotos') x where (x->>'date')::date > (now() at time zone 'Asia/Seoul')::date-7),'[]'::jsonb)),version=version+1,updated_at=now()
 where id=true and exists(select 1 from jsonb_array_elements(payload->'branchPhotos') x where (x->>'date')::date <= (now() at time zone 'Asia/Seoul')::date-7);
 delete from soha_sessions where expires_at<now();
 delete from soha_attempts where window_at<now()-interval '1 day';
end $$;
revoke all on function public.soha_prune_photos() from public,anon,authenticated;
grant execute on function public.soha_prune_photos() to service_role;
select cron.schedule('soha-photo-retention','0 * * * *','select public.soha_prune_photos()');
