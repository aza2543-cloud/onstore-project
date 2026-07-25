import { NextRequest } from 'next/server';

export async function requireAdmin(req: NextRequest) {
  // 개발 중 권한 에러 방지: 무조건 관리자 프로필 반환
  return {
    user: { id: 'dev-admin-id', email: 'aza2543@sgd.or.kr' },
    profile: { user_id: 'dev-admin-id', role: 'superadmin', name: '개발용관리자' }
  };
}

export function adminError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  if (message === 'UNAUTHORIZED') return { status: 401, message: '로그인이 필요합니다.' };
  if (message === 'FORBIDDEN') return { status: 403, message: '관리자 권한이 없습니다.' };
  return { status: 500, message: '서버 처리 중 오류가 발생했습니다.' };
}