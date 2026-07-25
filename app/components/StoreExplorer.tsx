'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { Store, StoreType } from '@/lib/types';

declare global { interface Window { kakao: any; } }
const labels: Record<StoreType, string> = { onstore: '온스토어', justdream: '그냥드림' };
type UserLocation = { latitude:number; longitude:number };

function distanceKm(a:UserLocation,b:UserLocation){const r=6371;const dLat=(b.latitude-a.latitude)*Math.PI/180;const dLon=(b.longitude-a.longitude)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*Math.PI/180)*Math.cos(b.latitude*Math.PI/180)*Math.sin(dLon/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function storeStatus(store:Store, now=new Date()){
  if(store.is_temporarily_closed)return {open:false,label:'임시휴무'};
  if((store.closed_weekdays??[]).includes(now.getDay()))return {open:false,label:'오늘 휴무'};
  if(!store.open_time||!store.close_time)return {open:null,label:'운영시간 확인'};
  const mins=now.getHours()*60+now.getMinutes();const [oh,om]=store.open_time.split(':').map(Number);const [ch,cm]=store.close_time.split(':').map(Number);const start=oh*60+om,end=ch*60+cm;
  const open=end>=start?mins>=start&&mins<end:mins>=start||mins<end;
  return {open,label:open?'영업 중':'영업 종료'};
}

export default function StoreExplorer(){
 const mapRef=useRef<HTMLDivElement>(null),mapInstanceRef=useRef<any>(null),markersRef=useRef<any[]>([]),userMarkerRef=useRef<any>(null);
 const [stores,setStores]=useState<Store[]>([]),[selected,setSelected]=useState<Store|null>(null),[filter,setFilter]=useState<'all'|StoreType>('all'),[query,setQuery]=useState(''),[category,setCategory]=useState('all'),[item,setItem]=useState('all'),[onlyOpen,setOnlyOpen]=useState(false),[onlyFavorites,setOnlyFavorites]=useState(false),[favorites,setFavorites]=useState<string[]>([]),[userLocation,setUserLocation]=useState<UserLocation|null>(null),[sort,setSort]=useState<'name'|'distance'>('name'),[loading,setLoading]=useState(true),[error,setError]=useState('');

 useEffect(()=>{try{setFavorites(JSON.parse(localStorage.getItem('onstore-favorites')||'[]'))}catch{}},[]);
 useEffect(()=>{localStorage.setItem('onstore-favorites',JSON.stringify(favorites))},[favorites]);
 const categories=useMemo(()=>Array.from(new Set(stores.map(s=>s.category).filter(Boolean))).sort(),[stores]);
 const items=useMemo(()=>Array.from(new Set(stores.flatMap(s=>s.available_items??[]))).sort(),[stores]);
 const filteredStores=useMemo(()=>{const q=query.trim().toLowerCase();return stores.filter(s=>(filter==='all'||s.store_type===filter)&&(category==='all'||s.category===category)&&(item==='all'||s.available_items?.includes(item))&&(!onlyOpen||storeStatus(s).open===true)&&(!onlyFavorites||favorites.includes(s.id))&&(!q||[s.name,s.category,s.address,...(s.available_items??[])].join(' ').toLowerCase().includes(q))).sort((a,b)=>sort==='distance'&&userLocation?distanceKm(userLocation,a)-distanceKm(userLocation,b):a.name.localeCompare(b.name,'ko'));},[stores,filter,category,item,onlyOpen,onlyFavorites,favorites,query,sort,userLocation]);

 useEffect(()=>{(async()=>{try{const db=createSupabaseBrowserClient();const {data,error}=await db.from('stores').select('*').eq('is_active',true).order('name');if(error)throw error;setStores((data??[]) as Store[])}catch(e){setError(e instanceof Error?e.message:'매장 정보를 불러오지 못했습니다.')}finally{setLoading(false)}})()},[]);

 // 📍 카카오 지도 스크립트 로드 및 초기화 부분 수정 완료
 useEffect(()=>{
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || 'cfaabb0f6c0ccd87db6f9e51fcf28569';
  if(!key||!mapRef.current)return;

  const initializeMap = () => {
    if(!mapRef.current||mapInstanceRef.current)return;
    mapInstanceRef.current=new window.kakao.maps.Map(mapRef.current,{
      center:new window.kakao.maps.LatLng(37.4924,126.7828),
      level:5
    });
  };

  // 이미 카카오 스크립트가 로드되어 있는 경우
  if(window.kakao?.maps){
    window.kakao.maps.load(initializeMap);
    return;
  }
  
  // 기존 스크립트 태그 확인
  const scriptId = 'kakao-map-sdk';
  let script = document.getElementById(scriptId) as HTMLScriptElement;

  if(!script){
    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(initializeMap);
    script.onerror = () => setError('카카오 지도를 불러오지 못했습니다.');
    document.head.appendChild(script);
  } else {
    script.addEventListener('load', () => window.kakao.maps.load(initializeMap));
  }
 },[]);

 // 📍 위치 핀(Pin) 디자인 마커 생성 (온스토어: 주황 핀 / 그냥드림: 초록 핀)
 useEffect(()=>{
  if(!mapInstanceRef.current||!window.kakao?.maps)return;

  // 기존 핀 지우기
  markersRef.current.forEach(m=>m.setMap(null));

  markersRef.current=filteredStores.map(store=>{
    const position = new window.kakao.maps.LatLng(store.latitude, store.longitude);
    const isJustdream = store.store_type === 'justdream';
    const labelText = isJustdream ? '그냥드림' : '온스토어';
    const bgColor = isJustdream ? '#10b981' : '#f97316'; // 초록 vs 주황

    // 핀(Pin) 모양의 커스텀 HTML 생성
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate(-50%, -100%);
    `;

    // 핀 헤더 (글자 박스)
    const pinHeader = document.createElement('div');
    pinHeader.style.cssText = `
      background-color: ${bgColor};
      color: #ffffff;
      padding: 5px 10px;
      border-radius: 14px;
      font-size: 11px;
      font-weight: bold;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      border: 2px solid #ffffff;
      white-space: nowrap;
    `;
    pinHeader.innerText = labelText;

    // 핀 꼬리 (아래쪽 삼각 뾰족이)
    const pinTail = document.createElement('div');
    pinTail.style.cssText = `
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid ${bgColor};
      margin-top: -1px;
    `;

    content.appendChild(pinHeader);
    content.appendChild(pinTail);

    // 클릭 시 선택
    content.onclick = () => setSelected(store);

    const overlay = new window.kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 1.0
    });

    overlay.setMap(mapInstanceRef.current);
    return overlay;
  });

  // 지도 영역 재조정
  if(filteredStores.length){
    const bounds=new window.kakao.maps.LatLngBounds();
    filteredStores.forEach(s=>bounds.extend(new window.kakao.maps.LatLng(s.latitude,s.longitude)));
    if(userLocation)bounds.extend(new window.kakao.maps.LatLng(userLocation.latitude,userLocation.longitude));
    mapInstanceRef.current.setBounds(bounds,40,40,40,40);
  }
 },[filteredStores,userLocation]);

 function moveToStore(s:Store){setSelected(s);mapInstanceRef.current?.panTo(new window.kakao.maps.LatLng(s.latitude,s.longitude));mapInstanceRef.current?.setLevel(3)}
 function moveToMyLocation(){if(!navigator.geolocation)return setError('현재 브라우저는 위치 기능을 지원하지 않습니다.');navigator.geolocation.getCurrentPosition(({coords})=>{const loc={latitude:coords.latitude,longitude:coords.longitude};setUserLocation(loc);setSort('distance');if(mapInstanceRef.current&&window.kakao?.maps){const p=new window.kakao.maps.LatLng(loc.latitude,loc.longitude);mapInstanceRef.current.panTo(p);userMarkerRef.current?.setMap(null);userMarkerRef.current=new window.kakao.maps.Marker({map:mapInstanceRef.current,position:p,title:'내 위치'})}},()=>setError('현재 위치를 확인하지 못했습니다. 브라우저 위치 권한을 허용해 주세요.'),{enableHighAccuracy:true,timeout:10000})}
 function toggleFavorite(id:string){setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
 async function shareStore(s:Store){const text=`${s.name} | ${s.address} | ${s.business_hours??'운영시간 문의'}`;try{if(navigator.share)await navigator.share({title:s.name,text,url:window.location.href});else{await navigator.clipboard.writeText(text);alert('매장 정보가 복사되었습니다.')}}catch{}}

 return <div className="explorer"><div className="section-heading inline-heading"><div><p className="eyebrow">우리 동네 지도</p><h2>참여 매장 찾기</h2></div><button className="outline-button" onClick={moveToMyLocation}>내 위치·거리순</button></div>
 <div className="toolbar advanced-toolbar"><div className="segmented">{(['all','onstore','justdream'] as const).map(v=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{v==='all'?'전체':labels[v]}</button>)}</div><input aria-label="매장 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="매장명 업종 주소 제공물품 검색"/><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="업종 필터"><option value="all">모든 업종</option>{categories.map(v=><option key={v}>{v}</option>)}</select><select value={item} onChange={e=>setItem(e.target.value)} aria-label="제공 물품 필터"><option value="all">모든 제공 물품</option>{items.map(v=><option key={v}>{v}</option>)}</select><label className="check-filter"><input type="checkbox" checked={onlyOpen} onChange={e=>setOnlyOpen(e.target.checked)}/> 지금 영업 중</label><label className="check-filter"><input type="checkbox" checked={onlyFavorites} onChange={e=>setOnlyFavorites(e.target.checked)}/> 즐겨찾기만</label></div>
 {error&&<div className="notice error">{error}</div>}<p className="result-summary">총 {filteredStores.length}곳 {userLocation&&'· 내 위치 기준 거리순 정렬'}</p>
 <div className="map-layout"><div ref={mapRef} className="map" aria-label="온스토어 지도"/><aside className="store-list">{loading&&<p className="empty">매장 정보를 불러오는 중입니다.</p>}{!loading&&filteredStores.length===0&&<p className="empty">조건에 맞는 매장이 없습니다.</p>}{filteredStores.map(s=>{const status=storeStatus(s);const dist=userLocation?distanceKm(userLocation,s):null;return <div key={s.id} className={`store-item-wrap ${selected?.id===s.id?'selected':''}`}><button className="store-item" onClick={()=>moveToStore(s)}><span className={`type-badge ${s.store_type}`}>{labels[s.store_type]}</span><span className={`open-badge ${status.open===true?'open':status.open===false?'closed':''}`}>{status.label}</span><strong>{s.name}</strong><small>{s.category}{dist!==null?` · ${dist<1?Math.round(dist*1000)+'m':dist.toFixed(1)+'km'}`:''}</small><span>{s.address}</span></button><button className="favorite-button" aria-label="즐겨찾기" onClick={()=>toggleFavorite(s.id)}>{favorites.includes(s.id)?'★':'☆'}</button></div>})}</aside></div>
 {selected&&(()=>{const status=storeStatus(selected);return <article className="detail-card"><div><span className={`type-badge ${selected.store_type}`}>{labels[selected.store_type]}</span><span className={`open-badge ${status.open===true?'open':status.open===false?'closed':''}`}>{status.label}</span><button className="favorite-inline" onClick={()=>toggleFavorite(selected.id)}>{favorites.includes(selected.id)?'★ 즐겨찾기 해제':'☆ 즐겨찾기'}</button><h3>{selected.name}</h3><p>{selected.description||'매장 상세 안내입니다.'}</p></div><dl><div><dt>업종</dt><dd>{selected.category}</dd></div><div><dt>주소</dt><dd>{selected.address}</dd></div><div><dt>영업시간</dt><dd>{selected.business_hours||[selected.open_time,selected.close_time].filter(Boolean).join('~')||'매장 문의'}</dd></div><div><dt>휴무 안내</dt><dd>{selected.holiday_note||((selected.closed_weekdays??[]).length?'등록된 정기휴무일 있음':'매장 문의')}</dd></div><div><dt>제공 물품</dt><dd>{selected.available_items?.join(', ')||'복지관 문의'}</dd></div><div><dt>전화</dt><dd>{selected.phone||'비공개'}</dd></div></dl><div className="detail-actions">{selected.phone&&<a className="primary-button" href={`tel:${selected.phone}`}>전화하기</a>}<a className="outline-button" target="_blank" rel="noreferrer" href={`https://map.kakao.com/link/to/${encodeURIComponent(selected.name)},${selected.latitude},${selected.longitude}`}>카카오 길찾기</a><a className="outline-button" target="_blank" rel="noreferrer" href={`https://map.naver.com/p/directions/-/-/-/transit?c=${selected.longitude},${selected.latitude},15,0,0,0,dh`}>네이버 지도</a><button className="outline-button" onClick={()=>shareStore(selected)}>공유하기</button></div></article>})()}</div>
}