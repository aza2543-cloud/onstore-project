import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      summary: {
        applications: 0,
        uniqueParticipants: 0,
        completed: 0,
        supports: 0,
        completionRate: 0
      },
      monthly: [],
      district: [],
      age: [],
      gender: [],
      items: [],
      storeUsage: [],
      generatedAt: new Date().toISOString()
    });
  } catch (e: any) {
    return NextResponse.json({
      summary: { applications: 0, uniqueParticipants: 0, completed: 0, supports: 0, completionRate: 0 },
      monthly: [],
      district: [],
      age: [],
      gender: [],
      items: [],
      storeUsage: [],
      generatedAt: new Date().toISOString()
    });
  }
}