import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 백엔드 API에서는 RLS를 우회하고 데이터를 안전하게 처리할 수 있는 SERVICE_ROLE_KEY를 사용합니다.
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

    // Service Role Key 기반 Admin Client 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'general') {
      const participantName = formData.get('participantName') as string;
      const birthDate = formData.get('birthDate') as string;
      const phone = formData.get('phone') as string;
      const gender = formData.get('gender') as string;
      const dong = formData.get('dong') as string;
      const address = formData.get('address') as string;
      const providedItems = formData.get('providedItems') as string;
      const emergencyCare = formData.get('emergencyCare') as string;
      const receiptFile = formData.get('receipt') as File | null;

      let receiptUrl: string | null = null;

      // 영수증 파일이 첨부된 경우 Supabase Storage에 업로드
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

      // usage_applications 테이블에 전체 데이터 저장
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

      // 안전한 숫자 변환 (NaN 및 빈값 방지)
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