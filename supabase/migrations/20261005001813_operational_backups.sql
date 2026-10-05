-- Revision history is independent of frontend deployments and seed imports.
-- Photos are excluded so a backup cannot extend their seven-day retention.
create table public.soha_state_backups (
  version bigint primary key,
  payload jsonb not null,
  saved_at timestamptz not null,
  backed_up_at timestamptz not null default now()
);
create index soha_state_backups_saved_at on public.soha_state_backups(saved_at);
alter table public.soha_state_backups enable row level security;
revoke all on public.soha_state_backups from public, anon, authenticated;
grant select, insert, delete on public.soha_state_backups to service_role;

create function public.soha_backup_state() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  insert into public.soha_state_backups(version, payload, saved_at)
  values (old.version, old.payload - 'branchPhotos', old.updated_at)
  on conflict (version) do nothing;
  delete from public.soha_state_backups
    where backed_up_at < now() - interval '30 days'
       or version in (select version from public.soha_state_backups order by version desc offset 100);
  return new;
end;
$$;
revoke all on function public.soha_backup_state() from public, anon, authenticated;
grant execute on function public.soha_backup_state() to service_role;
create trigger soha_backup_before_update before update on public.soha_state
for each row when (old.payload is distinct from new.payload)
execute function public.soha_backup_state();

insert into public.soha_state_backups(version, payload, saved_at)
select version, payload - 'branchPhotos', updated_at from public.soha_state
on conflict (version) do nothing;
