import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  // 둘 중 하나라도 들어있으면 인식하도록 처리
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('환경변수 로드 실패:', { url: !!url, serviceRoleKey: !!serviceRoleKey });
    throw new Error('Supabase 서버 환경변수가 설정되지 않았습니다. (URL 또는 Service Role Key 누락)');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}