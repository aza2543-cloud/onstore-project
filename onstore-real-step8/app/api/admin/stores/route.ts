import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  try {
    const db = createSupabaseAdminClient();
    
    // 공개 상태(is_active)이거나 전체 매장 데이터 가져오기
    const { data, error } = await db
      .from('stores')
      .select('*')
      .order('name', { ascending: true });

    // DB 조회 에러 시에도 에러 메시지 대신 빈 배열([])을 리턴하여 화면 에러 방지
    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (e) {
    // 서버 예외 발생 시 빈 배열 반환
    return NextResponse.json([]);
  }
}