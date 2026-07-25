import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';
import { allowedDistricts, cleanText, isValidPhone } from '@/lib/validation';

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

    if (!payload.category || !payload.content) return NextResponse.json({ message: '건의 유형과 내용을 입력해 주세요.' }, { status: 400 });
    if (payload.reply_requested && !payload.contact_phone) return NextResponse.json({ message: '답변을 요청한 경우 연락처를 입력해 주세요.' }, { status: 400 });
    if (payload.contact_phone && !isValidPhone(payload.contact_phone)) return NextResponse.json({ message: '연락처 형식을 확인해 주세요.' }, { status: 400 });
    if (payload.contact_phone && !payload.privacy_agreed) return NextResponse.json({ message: '연락처를 입력한 경우 개인정보 수집 및 이용 동의가 필요합니다.' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('suggestions').insert(payload).select('id, created_at').single();
    if (error) throw error;

    return NextResponse.json({ ok: true, receiptId: data.id, createdAt: data.created_at }, { status: 201 });
  } catch (error) {
    console.error('suggestion error', error);
    return NextResponse.json({ message: '건의사항을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
