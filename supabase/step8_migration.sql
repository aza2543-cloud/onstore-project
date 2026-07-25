-- 8단계 통계 고도화용 인덱스
create index if not exists usage_applications_created_status_idx on public.usage_applications(created_at desc,status);
create index if not exists usage_applications_dong_idx on public.usage_applications(dong);
create index if not exists usage_applications_gender_idx on public.usage_applications(gender);
create index if not exists support_records_item_date_idx on public.support_records(item_name,support_date desc);
