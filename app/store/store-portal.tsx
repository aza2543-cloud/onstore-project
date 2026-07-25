'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function AdminPortal() {
  const [supabase, setSupabase] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const c = createSupabaseBrowserClient();
    setSupabase(c);
    c.auth.getSession().then(({ data }: any) => setSession(data.session));
    const {
      data: { subscription },
    } = c.auth.onAuthStateChange((_e: any, s: any) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAdminData();
  }, [session]);

  // 관리자 로그인 처리
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg('관리자 로그인 정보를 확인해 주세요.');
  }

  // 관리자 전용 전체 신청 내역 불러오기
  async function loadAdminData() {
    if (!session) return;
    setLoading(true);
    try {
      const r = await fetch('/api/admin/applications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await r.json();
      if (r.ok) {
        setApplications(j.items || []);
      } else {
        setMsg(j.error || '관리자 권한 데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setMsg(`데이터 로딩 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // 승인/반려 상태 변경 처리
  async function updateStatus(id: string, status: string) {
    if (!session) return;
    const r = await fetch(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      alert(`상태가 [${status}]로 변경되었습니다.`);
      loadAdminData();
    } else {
      const j = await r.json();
      alert(`처리 실패: ${j.error}`);
    }
  }

  // 1. 관리자 비로그인 화면 (관리자 전용 로그인)
  if (!session) {
    return (
      <main className="portal">
        <section className="portal-card">
          <h1>관리자 로그인</h1>
          <p>심곡동종합사회복지관 관리자 계정으로 로그인해 주세요.</p>
          <form onSubmit={login} className="form-grid">
            <label>
              관리자 이메일
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="primary">관리자 로그인</button>
          </form>
          {msg && <p className="notice danger" style={{ color: '#e53e3e', marginTop: '12px' }}>{msg}</p>}
          <a href="/" style={{ display: 'inline-block', marginTop: '16px' }}>← 홈페이지로 돌아가기</a>
        </section>
      </main>
    );
  }

  // 2. 관리자 로그인 완료 화면 (전체 신청 내역 관리)
  return (
    <main className="portal">
      <div className="portal-head">
        <div>
          <h1>관리자 전용 페이지</h1>
          <p>최종 관리자 계정: {session.user.email}</p>
        </div>
        <button onClick={() => supabase?.auth.signOut()}>로그아웃</button>
      </div>

      {msg && <p className="notice">{msg}</p>}

      {/* 전체 매장 신청 내역 관리 목록 */}
      <section className="portal-card">
        <h2>전체 참여업체 접수 및 이용 내역</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>접수일</th>
                <th>매장명</th>
                <th>성명</th>
                <th>생년월일</th>
                <th>지역</th>
                <th>제공물품</th>
                <th>영수증</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    접수된 신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                applications.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{item.store_name || '-'}</td>
                    <td>{item.participant_name}</td>
                    <td>{item.birth_date}</td>
                    <td>{item.dong}</td>
                    <td>{item.provided_items || '-'}</td>
                    <td>
                      {item.receipt_url ? (
                        <a href={item.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: '#0066cc' }}>
                          보기
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{item.status || '대기'}</td>
                    <td>
                      <button
                        onClick={() => updateStatus(item.id, '승인')}
                        style={{ marginRight: '4px', padding: '2px 8px', fontSize: '12px' }}
                      >
                        승인
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, '반려')}
                        style={{ padding: '2px 8px', fontSize: '12px', backgroundColor: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px' }}
                      >
                        반려
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}