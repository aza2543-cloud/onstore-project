import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';
import { cleanText, isValidEmail, isValidPhone } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.website) return NextResponse.json({ ok: true });

    const payload = {
      business_name: cleanText(body.businessName, 100),
      representative_name: cleanText(body.representativeName, 50),
      category: cleanText(body.category, 60),
      phone: cleanText(body.phone, 30),
      email: cleanText(body.email, 120),
      address: cleanText(body.address, 200),
      business_hours: cleanText(body.businessHours, 120),
      available_items: cleanText(body.availableItems, 500),
      motivation: cleanText(body.motivation, 1000),
      privacy_agreed: body.privacyAgreed === true,
      status: 'received',
    };

    if (!payload.business_name || !payload.representative_name || !payload.category || !payload.phone || !payload.address || !payload.available_items) {
      return NextResponse.json({ message: '필수 항목을 모두 입력해 주세요.' }, { status: 400 });
    }
    if (!payload.privacy_agreed) return NextResponse.json({ message: '개인정보 수집 및 이용 동의가 필요합니다.' }, { status: 400 });
    if (!isValidPhone(payload.phone)) return NextResponse.json({ message: '연락처 형식을 확인해 주세요.' }, { status: 400 });
    if (!isValidEmail(payload.email)) return NextResponse.json({ message: '이메일 형식을 확인해 주세요.' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('vendor_applications').insert(payload).select('id, created_at').single();
    if (error) throw error;

    return NextResponse.json({ ok: true, receiptId: data.id, createdAt: data.created_at }, { status: 201 });
  } catch (error) {
    console.error('vendor application error', error);
    return NextResponse.json({ message: '신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
