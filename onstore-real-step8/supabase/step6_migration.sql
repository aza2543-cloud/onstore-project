create extension if not exists pgcrypto;
create table if not exists public.participant_notes (
  id uuid primary key default gen_random_uuid(), identity_hash text not null, note text not null,
  is_urgent boolean not null default false, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.support_records (
  id uuid primary key default gen_random_uuid(), identity_hash text not null,
  usage_application_id uuid references public.usage_applications(id) on delete set null,
  store_id uuid not null references public.stores(id), item_name text not null,
  quantity numeric not null default 1 check(quantity>0), support_date timestamptz not null default now(),
  note text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
alter table public.participant_notes enable row level security;
alter table public.support_records enable row level security;
create index if not exists participant_notes_hash_idx on public.participant_notes(identity_hash, created_at desc);
create index if not exists support_records_hash_idx on public.support_records(identity_hash, support_date desc);
create index if not exists support_records_store_idx on public.support_records(store_id, support_date desc);
create or replace view public.participant_crm_summary as
select u.identity_hash,max(u.participant_name) participant_name,max(u.birth_date) birth_date,max(u.gender) gender,
max(u.phone) phone,max(u.dong) dong,max(u.address) address,count(*)::int application_count,
count(*) filter(where u.status='completed')::int completed_application_count,
coalesce((select count(*) from public.support_records s where s.identity_hash=u.identity_hash),0)::int support_count,
(select max(s.support_date) from public.support_records s where s.identity_hash=u.identity_hash) last_used_at,
exists(select 1 from public.participant_notes n where n.identity_hash=u.identity_hash and n.is_urgent=true) urgent,
max(u.created_at) last_application_at from public.usage_applications u group by u.identity_hash;
revoke all on public.participant_crm_summary from public,anon,authenticated;
grant select on public.participant_crm_summary to service_role;
