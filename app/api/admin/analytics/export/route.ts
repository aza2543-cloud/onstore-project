import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin,adminError} from '@/lib/adminAuth';
import {createSupabaseAdminClient} from '@/lib/serverSupabase';
function csvCell(v:any){const s=String(v??'').replace(/"/g,'""');return `"${s}"`}
export async function GET(req:NextRequest){
 try{
  await requireAdmin(req); const db=createSupabaseAdminClient();
  const from=req.nextUrl.searchParams.get('from'),to=req.nextUrl.searchParams.get('to');
  let q=db.from('usage_applications').select('participant_name,birth_date,gender,phone,dong,address,status,provided_items,created_at,stores(name)');
  if(from)q=q.gte('created_at',`${from}T00:00:00+09:00`); if(to)q=q.lte('created_at',`${to}T23:59:59+09:00`);
  const{data,error}=await q.order('created_at',{ascending:false}); if(error)throw error;
  const head=['신청일','대상자명','생년월일','성별','연락처','거주동','주소','신청상태','신청물품','매장'];
  const lines=[head.map(csvCell).join(','),...(data||[]).map((r:any)=>[r.created_at,r.participant_name,r.birth_date,r.gender,r.phone,r.dong,r.address,r.status,r.provided_items,Array.isArray(r.stores)?r.stores[0]?.name:r.stores?.name].map(csvCell).join(','))];
  return new NextResponse('\uFEFF'+lines.join('\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="onstore-statistics-${new Date().toISOString().slice(0,10)}.csv"`}})
 }catch(e){const x=adminError(e);return NextResponse.json({error:x.message},{status:x.status})}
}
