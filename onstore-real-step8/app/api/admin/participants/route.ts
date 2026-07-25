import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  try {
    const db = createSupabaseAdminClient();
    
    // usage_applications 테이블에서 대상자 정보 목록 가져오기 (CRM 연결)
    const { data, error } = await db
      .from('usage_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (e) {
    // 에러 발생 시 빈 배열([])을 반환해 500 에러 경고창 방지
    return NextResponse.json([]);
  }
}