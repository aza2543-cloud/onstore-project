import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/serverSupabase';

export async function GET(req: NextRequest) {
  try {
    const db = createSupabaseAdminClient();

    const getCount = async (tableName: string, statusFilter?: string[]) => {
      try {
        let query = db.from(tableName).select('*', { count: 'exact', head: true });
        if (statusFilter) query = query.in('status', statusFilter);
        const { count, error } = await query;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const getData = async (tableName: string) => {
      try {
        const { data, error } = await db.from(tableName).select('*');
        return error || !data ? [] : data;
      } catch {
        return [];
      }
    };

    const [storesCount, vendorsCount, usageCount, suggestionsCount, consultsCount, storesList, applicationsList] = await Promise.all([
      getCount('stores'),
      getCount('vendor_applications', ['received', 'reviewing']),
      getCount('usage_applications', ['received', 'reviewing']),
      getCount('suggestions', ['received', 'reviewing']),
      getCount('consultation_records'),
      getData('stores'),
      getData('usage_applications')
    ]);

    return NextResponse.json({
      stores: storesCount,
      pendingVendors: vendorsCount,
      pendingUsage: usageCount,
      pendingSuggestions: suggestionsCount,
      consultations: consultsCount,
      storesList: storesList || [],
      applications: applicationsList || [],
      vendors: [],
      suggestions: [],
      crm: [],
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
      stores: 0, pendingVendors: 0, pendingUsage: 0, pendingSuggestions: 0, consultations: 0,
      storesList: [], applications: [], vendors: [], suggestions: [], crm: [],
      summary: { applications: 0, uniqueParticipants: 0, completed: 0, supports: 0, completionRate: 0 },
      monthly: [], district: [], age: [], gender: [], items: [], storeUsage: [], generatedAt: new Date().toISOString()
    });
  }
}