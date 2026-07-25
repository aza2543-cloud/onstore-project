import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  try {
    const db = createSupabaseAdminClient();
    
    // usage_applications 테이블 조회 (에러 발생 시 빈 배열 반환)
    const { data, error } = await db
      .from('usage_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (e) {
    // 서버 오류가 나더라도 500 에러 대신 빈 목록([])을 넘겨 화면 에러 방지
    return NextResponse.json([]);
  }
}