import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// GET 요청 처리 (건의사항 목록 - 순수 배열 반환)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }

    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // DB에서 건의사항 목록 조회
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('건의사항 DB 조회 실패:', error);
      return NextResponse.json([], { status: 200 });
    }

    // 프론트엔드 Table 컴포넌트가 바로 map을 돌릴 수 있도록 순수 배열만 반환
    return NextResponse.json(data || [], { status: 200 });
  } catch (err: any) {
    console.error('Server Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST 요청 처리
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }

    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const body = await req.json();

    const { data, error } = await supabase
      .from('suggestions')
      .insert([
        {
          ...body,
          user_id: user.id,
        },
      ])
      .select();

    if (error) {
      console.error('건의사항 등록 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error('Server Error:', err);
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}