import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';
import { allowedDistricts, cleanText, isValidPhone } from '@/lib/validation';

// 1. GET 요청 대응 (405 에러 방지 및 데이터 조회 기능 지원)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    
    // 필요 시 목록 조회 (최신순 20개)
    const { data, error } = await supabase
      .from('suggestions')
      .select('id, category, district, content, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ ok: true, suggestions: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error('suggestion GET error:', error);
    // GET 요청 시 에러가 나더라도 프론트엔드가 멈추지 않게 빈 배열 반환
    return NextResponse.json({ ok: false, suggestions: [], error: error?.message }, { status: 200 });
  }
}

// 2. 기존 POST 요청 (건의사항 접수)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.website) return NextResponse.json({ ok: true });

    const district = cleanText(body.district, 30);
    const payload = {
      category: cleanText(body.category, 40),
      district: allowedDistricts.includes(district as typeof allowedDistricts[number]) ? district : '기타',
      content: cleanText(body.content, 1500),
      contact_phone: cleanText(body.contactPhone, 30) || null,
      reply_requested: body.replyRequested === true,
      privacy_agreed: body.privacyAgreed === true,
      status: 'received',
    };

    if (!payload.category || !payload.content) {
      return NextResponse.json({ message: '건의 유형과 내용을 입력해 주세요.' }, { status: 400 });
    }
    if (payload.reply_requested && !payload.contact_phone) {
      return NextResponse.json({ message: '답변을 요청한 경우 연락처를 입력해 주세요.' }, { status: 400 });
    }
    if (payload.contact_phone && !isValidPhone(payload.contact_phone)) {
      return NextResponse.json({ message: '연락처 형식을 확인해 주세요.' }, { status: 400 });
    }
    if (payload.contact_phone && !payload.privacy_agreed) {
      return NextResponse.json({ message: '연락처를 입력한 경우 개인정보 수집 및 이용 동의가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('suggestions')
      .insert(payload)
      .select('id, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, receiptId: data.id, createdAt: data.created_at }, { status: 201 });
  } catch (error: any) {
    console.error('suggestion POST error:', error);
    return NextResponse.json(
      { 
        message: error?.message || '건의사항을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        details: error?.details || null
      }, 
      { status: 500 }
    );
  }
}