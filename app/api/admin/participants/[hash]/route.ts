import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin,adminError} from '@/lib/adminAuth';
import {createSupabaseAdminClient} from '@/lib/serverSupabase';
export async function GET(req:NextRequest,{params}:{params:Promise<{hash:string}>}){try{await requireAdmin(req);const{hash}=await params;const db=createSupabaseAdminClient();const[{data:applications,error:aerr},{data:notes,error:nerr},{data:supports,error:serr}]=await Promise.all([
 db.from('usage_applications').select('id,store_id,participant_name,birth_date,gender,phone,dong,address,crisis_summary,provided_items,status,created_at,updated_at,stores(name)').eq('identity_hash',hash).order('created_at',{ascending:false}),
 db.from('participant_notes').select('id,note,is_urgent,created_at,admin_users(name)').eq('identity_hash',hash).order('created_at',{ascending:false}),
 db.from('support_records').select('id,item_name,quantity,support_date,note,stores(name),admin_users(name)').eq('identity_hash',hash).order('support_date',{ascending:false})]);
 if(aerr||nerr||serr)throw(aerr||nerr||serr);return NextResponse.json({applications:applications||[],notes:notes||[],supports:supports||[]})}catch(e){const x=adminError(e);return NextResponse.json({error:x.message},{status:x.status})}}
