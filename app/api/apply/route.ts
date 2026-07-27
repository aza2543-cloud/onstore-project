import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 1. GET: 중복 대상자 조회 기능 (participants & usage_applications 양쪽 모두 체크)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();
    const birthDate = searchParams.get('birthDate')?.trim();

    if (!name || !birthDate) {
      return NextResponse.json(
        { isDuplicate: false, message: '이름과 생년월일을 정확히 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // [체크 1] participants (대상자 CRM 테이블)에서 중복 확인
    const { data: participantData, error: pError } = await supabase
      .from('participants')
      .select('id')
      .eq('participant_name', name)
      .eq('birth_date', birthDate)
      .limit(1);

    if (pError) {
      console.warn('participants table query warning:', pError.message);
    }

    if (participantData && participantData.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        exists: true,
        message: '이미 CRM에 등록되어 있는 대상자입니다.',
      });
    }

    // [체크 2] usage_applications (이용 신청 테이블)에서 중복 확인
    const { data: applicationData, error: aError } = await supabase
      .from('usage_applications')
      .select('id')
      .eq('participant_name', name)
      .eq('birth_date', birthDate)
      .limit(1);

    if (aError) {
      console.warn('usage_applications table query warning:', aError.message);
    }

    if (applicationData && applicationData.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        exists: true,
        message: '이미 신청 내역이 존재하여 중복 등록할 수 없습니다.',
      });
    }

    // 둘 다 없을 경우 신규 등록 가능
    return NextResponse.json({
      isDuplicate: false,
      exists: false,
      message: '신규 등록이 가능한 대상자입니다.',
    });
  } catch (error: any) {
    console.error('API /api/apply GET Error:', error);
    return NextResponse.json(
      { error: error.message || '중복 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 2. POST: 신청서 제출 기능 (기존 유지)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const type = formData.get('type') as string;
    const storeName = formData.get('storeName') as string;
    const supportReason = formData.get('supportReason') as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'general') {
      const participantName = (formData.get('participantName') as string)?.trim();
      const birthDate = (formData.get('birthDate') as string)?.trim();
      const phone = formData.get('phone') as string;
      const gender = formData.get('gender') as string;
      const dong = formData.get('dong') as string;
      const address = formData.get('address') as string;
      const providedItems = formData.get('providedItems') as string;
      const emergencyCare = formData.get('emergencyCare') as string;
      const receiptFile = formData.get('receipt') as File | null;

      let receiptUrl: string | null = null;

      if (receiptFile && receiptFile.size > 0) {
        try {
          const fileExt = receiptFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `receipts/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, receiptFile);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('receipts')
              .getPublicUrl(filePath);
            receiptUrl = publicUrlData.publicUrl;
          } else {
            console.warn('영수증 파일 업로드 경고:', uploadError.message);
          }
        } catch (fileErr) {
          console.warn('영수증 파일 처리 중 오류 발생:', fileErr);
        }
      }

      const { error } = await supabase.from('usage_applications').insert([
        {
          type,
          store_name: storeName,
          participant_name: participantName,
          birth_date: birthDate,
          phone,
          gender,
          dong,
          address,
          provided_items: providedItems,
          emergency_care: emergencyCare || null,
          support_reason: supportReason || null,
          receipt_url: receiptUrl,
        },
      ]);

      if (error) {
        console.error('Usage Applications Insert Error:', error);
        throw error;
      }
    } else if (type === 'agency') {
      const agencyName = formData.get('agencyName') as string;
      const department = formData.get('department') as string;
      const managerName = formData.get('managerName') as string;
      const managerPhone = formData.get('managerPhone') as string;
      const targetCountRaw = formData.get('targetCount');
      const amountRaw = formData.get('amount');

      const targetCount = targetCountRaw ? parseInt(String(targetCountRaw), 10) : 0;
      const amount = amountRaw ? parseInt(String(amountRaw), 10) : 0;

      const { error } = await supabase.from('agency_applications').insert([
        {
          type,
          store_name: storeName,
          agency_name: agencyName,
          department: department || null,
          manager_name: managerName,
          manager_phone: managerPhone,
          target_count: isNaN(targetCount) ? 0 : targetCount,
          amount: isNaN(amount) ? 0 : amount,
          support_reason: supportReason || null,
        },
      ]);

      if (error) {
        console.error('Agency Applications Insert Error:', error);
        throw error;
      }
    } else {
      return NextResponse.json({ error: '유효하지 않은 신청 유형입니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '접수 완료' });
  } catch (error: any) {
    console.error('API /api/apply Server Error Details:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}