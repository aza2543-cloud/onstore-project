export type SmsPayload={to:string;message:string;referenceType:string;referenceId:string};
export async function sendSms(payload:SmsPayload){
 const mode=(process.env.SMS_PROVIDER||'mock').toLowerCase();
 if(mode==='mock') return {provider:'mock',providerMessageId:`mock-${Date.now()}`,raw:{ok:true}};
 if(mode!=='webhook') throw new Error('지원하지 않는 SMS_PROVIDER입니다.');
 const url=process.env.SMS_WEBHOOK_URL;
 if(!url) throw new Error('SMS_WEBHOOK_URL이 설정되지 않았습니다.');
 const headers:Record<string,string>={'Content-Type':'application/json'};
 if(process.env.SMS_WEBHOOK_TOKEN) headers.Authorization=`Bearer ${process.env.SMS_WEBHOOK_TOKEN}`;
 const body={to:payload.to,from:process.env.SMS_SENDER_NUMBER||'',message:payload.message,referenceType:payload.referenceType,referenceId:payload.referenceId};
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
 const text=await r.text(); let raw:any=text; try{raw=JSON.parse(text)}catch{}
 if(!r.ok) throw new Error(typeof raw==='object'?(raw.message||raw.error||'문자 발송 실패'):`문자 발송 실패 (${r.status})`);
 return {provider:'webhook',providerMessageId:raw?.messageId||raw?.id||null,raw};
}
export function normalizePhone(v:string){return String(v||'').replace(/\D/g,'')}
