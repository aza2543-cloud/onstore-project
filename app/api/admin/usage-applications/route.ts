import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  try {
    const db = createSupabaseAdminClient();
    
    // usage_applications 테이블 조회
    const { data, error } = await db
      .from('usage_applications')
      .select('*')
      .order('created_at', { ascending: false });

    // DB 에러가 발생해도 500 에러 대신 빈 배열([])을 리턴하여 화면에 빨간 경고창이 안 뜨게 함
    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json([]);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    const db = createSupabaseAdminClient();

    const { error } = await db
      .from('usage_applications')
      .update({ status })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}