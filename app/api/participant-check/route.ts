import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// YYYYMMDD -> YYYY-MM-DD 변환 및 유효 날짜 검증 함수
function formatAndValidateDate(rawDate: string): string | null {
  const cleaned = rawDate.replace(/\D/g, ''); // 숫자만 추출
  if (cleaned.length !== 8) return null;

  const year = cleaned.substring(0, 4);
  const month = cleaned.substring(4, 6);
  const day = cleaned.substring(6, 8);

  const formatted = `${year}-${month}-${day}`;

  // 실제로 유효한 날짜인지 검증 (예: 0000-00-00, 2024-02-31 차단)
  const dateObj = new Date(formatted);
  if (isNaN(dateObj.getTime())) return null;

  return formatted;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, birthDate } = body;

    if (!name || !birthDate) {
      return NextResponse.json(
        { error: '이름과 생년월일을 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    // 8자리 입력값을 YYYY-MM-DD 형식으로 변환 및 유효성 검사
    const formattedBirthDate = formatAndValidateDate(birthDate);

    if (!formattedBirthDate) {
      return NextResponse.json(
        { error: '유효하지 않은 생년월일 형식입니다. (예: 19900101)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // YYYY-MM-DD 규격에 맞추어 DB 조회
    const { data, error } = await supabase
      .from('participants')
      .select('id')
      .eq('name', name)
      .eq('birth_date', formattedBirthDate)
      .maybeSingle();

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'DB 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      duplicate: !!data,
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}