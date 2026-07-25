-- 기존 4단계 데이터베이스에 5단계 영업정보 필드를 추가합니다.
alter table public.stores add column if not exists open_time time;
alter table public.stores add column if not exists close_time time;
alter table public.stores add column if not exists closed_weekdays integer[] not null default '{}';
alter table public.stores add column if not exists holiday_note text;
alter table public.stores add column if not exists is_temporarily_closed boolean not null default false;

comment on column public.stores.closed_weekdays is '0=일요일, 1=월요일 ... 6=토요일';
