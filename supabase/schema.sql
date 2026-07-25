-- Supabase SQL Editor에서 실행하세요.
create extension if not exists pgcrypto;

create type public.store_type as enum ('onstore', 'justdream');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  store_type public.store_type not null,
  category text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  phone text,
  business_hours text,
  open_time time,
  close_time time,
  closed_weekdays integer[] not null default '{}',
  holiday_note text,
  is_temporarily_closed boolean not null default false,
  available_items text[] not null default '{}',
  description text,
  image_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_active_type_idx on public.stores (is_active, store_type);
create index stores_name_idx on public.stores (name);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

alter table public.stores enable row level security;

create policy "public can read active stores"
on public.stores for select
to anon, authenticated
using (is_active = true);

-- 관리자 쓰기 권한은 4단계 관리자 인증을 붙일 때 별도 정책으로 추가합니다.
-- 운영 초기에는 Supabase Dashboard의 Table Editor에서 관리자만 직접 등록하세요.

-- 2단계: 업체 참여 신청
create table if not exists public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  representative_name text not null,
  category text not null,
  phone text not null,
  email text,
  address text not null,
  business_hours text,
  open_time time,
  close_time time,
  closed_weekdays integer[] not null default '{}',
  holiday_note text,
  is_temporarily_closed boolean not null default false,
  available_items text not null,
  motivation text,
  privacy_agreed boolean not null default false,
  status text not null default 'received' check (status in ('received','reviewing','approved','rejected','closed')),
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vendor_applications_set_updated_at before update on public.vendor_applications
for each row execute function public.set_updated_at();
alter table public.vendor_applications enable row level security;
-- 공개 사용자는 직접 조회하거나 기록하지 못합니다. 서버의 service role을 통해서만 접수합니다.

-- 2단계: 주민 건의사항
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  district text not null default '기타',
  content text not null,
  contact_phone text,
  reply_requested boolean not null default false,
  privacy_agreed boolean not null default false,
  status text not null default 'received' check (status in ('received','reviewing','answered','closed')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suggestions_set_updated_at before update on public.suggestions
for each row execute function public.set_updated_at();
alter table public.suggestions enable row level security;
-- 공개 조회/삽입 정책 없음: 서버 API만 service role로 처리합니다.

create index if not exists vendor_applications_status_created_idx on public.vendor_applications(status, created_at desc);
create index if not exists suggestions_status_created_idx on public.suggestions(status, created_at desc);

-- ===== 3단계: 참여업체 계정 및 이용신청 =====
create extension if not exists pgcrypto;

create table if not exists public.store_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null default 'store' check (role in ('store','manager')),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_applications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  submitted_by uuid not null references auth.users(id),
  participant_name text not null,
  birth_date text not null check (birth_date ~ '^[0-9]{8}$'),
  identity_hash text generated always as (encode(digest(trim(participant_name) || '|' || birth_date, 'sha256'), 'hex')) stored,
  gender text,
  phone text not null,
  dong text not null check (dong in ('심곡1동','심곡2동','심곡3동','원미2동','소사동')),
  address text not null,
  crisis_summary text,
  provided_items text,
  consent boolean not null default false,
  status text not null default 'received' check (status in ('received','reviewing','approved','completed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists usage_applications_identity_hash_idx on public.usage_applications(identity_hash);
create index if not exists usage_applications_store_id_idx on public.usage_applications(store_id);

alter table public.store_users enable row level security;
alter table public.usage_applications enable row level security;

create or replace function public.check_participant_duplicate(p_identity text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.usage_applications
    where identity_hash = encode(extensions.digest(p_identity, 'sha256'), 'hex')
      and status in ('received','reviewing','approved','completed')
  );
$$;
revoke all on function public.check_participant_duplicate(text) from public, anon, authenticated;
grant execute on function public.check_participant_duplicate(text) to service_role;

-- 계정 생성 후 아래 예시처럼 auth 사용자와 매장을 연결하세요.
-- insert into public.store_users(user_id, store_id)
-- values ('AUTH_USER_UUID', 'STORE_UUID');

-- ===== 4단계: 관리자 계정, 상담기록, 감사기록 =====
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'staff' check (role in ('staff','manager','superadmin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.consultation_records (
  id uuid primary key default gen_random_uuid(),
  usage_application_id uuid not null references public.usage_applications(id) on delete cascade,
  counselor_id uuid not null references auth.users(id),
  consultation_date timestamptz not null default now(),
  method text not null default 'phone' check (method in ('phone','visit','other')),
  summary text not null,
  outcome text,
  follow_up_needed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  admin_user_id uuid references auth.users(id),
  action text not null,
  target_table text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.consultation_records enable row level security;
alter table public.admin_audit_logs enable row level security;
create index if not exists consultation_usage_idx on public.consultation_records(usage_application_id, consultation_date desc);
create index if not exists audit_created_idx on public.admin_audit_logs(created_at desc);

-- 관리자 계정 생성 예시
-- insert into public.admin_users(user_id, name, role)
-- values ('AUTH_USER_UUID', '정은혜', 'superadmin');

-- ===== 6단계: 대상자 CRM =====
create table if not exists public.participant_notes (
  id uuid primary key default gen_random_uuid(),
  identity_hash text not null,
  note text not null,
  is_urgent boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.support_records (
  id uuid primary key default gen_random_uuid(),
  identity_hash text not null,
  usage_application_id uuid references public.usage_applications(id) on delete set null,
  store_id uuid not null references public.stores(id),
  item_name text not null,
  quantity numeric not null default 1 check (quantity > 0),
  support_date timestamptz not null default now(),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.participant_notes enable row level security;
alter table public.support_records enable row level security;
create index if not exists participant_notes_hash_idx on public.participant_notes(identity_hash, created_at desc);
create index if not exists support_records_hash_idx on public.support_records(identity_hash, support_date desc);
create index if not exists support_records_store_idx on public.support_records(store_id, support_date desc);

create or replace view public.participant_crm_summary as
select
  u.identity_hash,
  max(u.participant_name) as participant_name,
  max(u.birth_date) as birth_date,
  max(u.gender) as gender,
  max(u.phone) as phone,
  max(u.dong) as dong,
  max(u.address) as address,
  count(*)::int as application_count,
  count(*) filter (where u.status = 'completed')::int as completed_application_count,
  coalesce((select count(*) from public.support_records s where s.identity_hash = u.identity_hash),0)::int as support_count,
  (select max(s.support_date) from public.support_records s where s.identity_hash = u.identity_hash) as last_used_at,
  exists(select 1 from public.participant_notes n where n.identity_hash=u.identity_hash and n.is_urgent=true) as urgent,
  max(u.created_at) as last_application_at
from public.usage_applications u
group by u.identity_hash;

revoke all on public.participant_crm_summary from public, anon, authenticated;
grant select on public.participant_crm_summary to service_role;
-- 7단계: 문자 알림 대기열과 발송 이력
create table if not exists public.notification_logs (
 id uuid primary key default gen_random_uuid(),
 channel text not null default 'sms' check(channel in ('sms')),
 recipient text not null,
 message text not null,
 status text not null default 'pending' check(status in ('pending','sent','failed','cancelled')),
 reference_type text not null,
 reference_id text,
 provider text,
 provider_message_id text,
 provider_response jsonb,
 error_message text,
 attempt_count integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 sent_at timestamptz,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists notification_pending_idx on public.notification_logs(status,next_attempt_at,created_at);
create index if not exists notification_reference_idx on public.notification_logs(reference_type,reference_id);
alter table public.notification_logs enable row level security;

create or replace function public.enqueue_notification(p_recipient text,p_message text,p_reference_type text,p_reference_id text,p_created_by uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 insert into public.notification_logs(recipient,message,reference_type,reference_id,created_by)
 values(regexp_replace(coalesce(p_recipient,''),'[^0-9]','','g'),p_message,p_reference_type,p_reference_id,p_created_by)
 returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.enqueue_notification(text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.enqueue_notification(text,text,text,text,uuid) to service_role;
-- 8단계 통계 고도화용 인덱스
create index if not exists usage_applications_created_status_idx on public.usage_applications(created_at desc,status);
create index if not exists usage_applications_dong_idx on public.usage_applications(dong);
create index if not exists usage_applications_gender_idx on public.usage_applications(gender);
create index if not exists support_records_item_date_idx on public.support_records(item_name,support_date desc);
