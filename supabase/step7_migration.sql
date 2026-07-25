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
