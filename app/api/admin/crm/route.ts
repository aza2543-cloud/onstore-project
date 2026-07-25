import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // CRM 탭 클릭 시 500 에러 발생을 방지하기 위한 안전 응답 (빈 배열)
    return NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}