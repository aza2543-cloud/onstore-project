'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// 이동할 구글 웹 앱 링크
const GOOGLE_APP_URL =
  'https://script.google.com/macros/s/AKfycbzwo5wpxPUkp9REKG4sOUq9JH1dRLTcVsu4EvKYalRbJlF_gmaFAGqkDxJU0SO7ton3gA/exec';

export default function StoreWorkPage() {
  const [supabase, setSupabase] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const c = createSupabaseBrowserClient();
    setSupabase(c);

    // 로그인 세션 확인
    c.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        // 이미 로그인되어 있으면 구글 링크로 바로 이동
        window.location.href = GOOGLE_APP_URL;
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // 로그인 처리
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoginMsg('');
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (error) {
      setLoginMsg(error.message || '로그인 정보가 일치하지 않습니다.');
      setIsLoading(false);
    } else {
      // 로그인 성공 시 구글 링크로 이동
      window.location.href = GOOGLE_APP_URL;
    }
  }

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#faf8f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#78716c', fontSize: '15px', fontWeight: 'bold' }}>참여업체 업무 시스템으로 이동 중입니다...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#faf8f5', minHeight: '100vh', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '420px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '9999px', marginBottom: '12px' }}>
            참여업체 전용
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#292524', margin: 0 }}>온(溫)스토어 업무 로그인</h2>
          <p style={{ fontSize: '13px', color: '#78716c', marginTop: '6px' }}>로그인 후 등록 페이지로 이동합니다.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#44403c', marginBottom: '6px' }}>아이디 (이메일)</label>
            <input
              type="email"
              placeholder="store@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d6d3d1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fafaf9' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#44403c', marginBottom: '6px' }}>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d6d3d1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fafaf9' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', marginTop: '8px', padding: '14px', backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
          >
            로그인 및 이동하기
          </button>

          {loginMsg && <p style={{ color: '#dc2626', fontSize: '12px', textAlign: 'center', margin: '4px 0 0' }}>{loginMsg}</p>}
        </form>
      </div>
    </div>
  );
}