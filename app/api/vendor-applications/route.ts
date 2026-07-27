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

    if (
      !payload.business_name ||
      !payload.representative_name ||
      !payload.category ||
      !payload.phone ||
      !payload.address ||
      !payload.available_items
    ) {
      return NextResponse.json(
        { message: '필수 항목을 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (!payload.privacy_agreed) {
      return NextResponse.json(
        { message: '개인정보 수집 및 이용 동의가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!isValidPhone(payload.phone)) {
      return NextResponse.json(
        { message: '연락처 형식을 확인해 주세요.' },
        { status: 400 }
      );
    }

    if (!isValidEmail(payload.email)) {
      return NextResponse.json(
        { message: '이메일 형식을 확인해 주세요.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('vendor_applications')
      .insert(payload)
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Supabase DB Insert Error:', error);
      // Supabase 에러 객체를 그대로 catch 블록으로 전달
      throw error;
    }

    return NextResponse.json(
      { ok: true, receiptId: data.id, createdAt: data.created_at },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('vendor application detailed error:', error);

    // DB 에러 내용을 브라우저 Response에서 정확히 확인할 수 있도록 반환
    const errorMessage =
      error?.message ||
      (typeof error === 'string' ? error : '알 수 없는 서버 에러가 발생했습니다.');

    const errorDetails = error?.details || error?.hint || error?.code || null;

    return NextResponse.json(
      {
        message: `[DB 에러] ${errorMessage}`,
        details: errorDetails,
        rawError: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}