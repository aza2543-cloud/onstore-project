'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type Tab = 'dashboard' | 'analytics' | 'crm' | 'stores' | 'vendors' | 'usage' | 'suggestions';

const statusKo: Record<string, string> = {
  received: '접수',
  reviewing: '검토중',
  approved: '승인',
  rejected: '반려',
  closed: '종결',
  completed: '완료',
  answered: '답변완료',
};

const labels: Record<Tab, string> = {
  dashboard: '대시보드',
  analytics: '통계 분석',
  crm: '대상자 CRM',
  stores: '매장 관리',
  vendors: '업체 신청',
  usage: '이용 신청',
  suggestions: '건의사항',
};

export default function AdminPortal() {
  const [supabase, setSupabase] = useState<any>(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 1. Supabase Client 및 Auth 토큰 로드
  useEffect(() => {
    const c = createSupabaseBrowserClient();
    setSupabase(c);
    c.auth.getSession().then(({ data }: any) => {
      setToken(data.session?.access_token || '');
    });
  }, []);

  // 2. 관리자 로그인
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setMsg('');
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) {
      setMsg(error.message);
    } else {
      setToken(authData.session?.access_token || '');
      setMsg('');
    }
  }

  // 3. API 공통 호출함수
  async function api(path: string, options: any = {}) {
    const r = await fetch('/api/admin/' + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || '요청 처리 중 오류가 발생했습니다.');
    return j;
  }

  // 4. 탭 이동 및 데이터 로드
  async function load(t: Tab = tab) {
    if (!token) return;
    try {
      setMsg('');
      setSelected(null);
      const path =
        t === 'dashboard'
          ? 'overview'
          : t === 'analytics'
          ? `analytics?from=${dateFrom}&to=${dateTo}`
          : t === 'vendors'
          ? 'vendor-applications'
          : t === 'usage'
          ? 'usage-applications'
          : t === 'crm'
          ? 'participants'
          : t;
      const resData = await api(path);
      setData(resData);
    } catch (e: any) {
      setMsg(e.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }

  useEffect(() => {
    if (token) load(tab);
  }, [token, tab]);

  // 📂 엑셀 / CSV 파일 업로드 시 자동 통계 집계 처리 함수
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const parsedData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!parsedData || parsedData.length === 0) {
          alert('엑셀 파일에 데이터가 없습니다.');
          return;
        }

        // 키 카운터용 헬퍼 함수
        const countBy = (keyCandidates: string[]) => {
          const map: Record<string, number> = {};
          parsedData.forEach((row) => {
            const keyName = keyCandidates.find((k) => row[k] !== undefined);
            const val = keyName ? String(row[keyName]).trim() : '기타/미지정';
            if (val) map[val] = (map[val] || 0) + 1;
          });
          return Object.entries(map).map(([label, value]) => ({ label, value }));
        };

        // 데이터 집계
        const total = parsedData.length;
        const completedCount = parsedData.filter((r) => {
          const st = String(r['상태'] || r['status'] || '');
          return st.includes('완료') || st.includes('completed') || st.includes('승인');
        }).length;

        const districts = countBy(['동', '행정동', '지역', 'dong', 'district']);
        const ages = countBy(['연령대', '나이', 'age']);
        const genders = countBy(['성별', 'gender']);
        const items = countBy(['지원품목', '제공물품', '품목', 'item', 'items']);
        const stores = countBy(['업체명', '매장명', '업체', 'store', 'store_name']);
        const monthly = countBy(['신청월', '월', '신청일자', 'created_at', 'date']);

        setData({
          summary: {
            applications: total,
            uniqueParticipants: new Set(
              parsedData.map((r) => r['이름'] || r['신청자'] || r['participant_name'] || JSON.stringify(r))
            ).size,
            completed: completedCount,
            supports: total,
            completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
          },
          district: districts,
          age: ages,
          gender: genders,
          items: items,
          storeUsage: stores,
          monthly: monthly,
          generatedAt: new Date().toISOString(),
        });

        alert(`총 ${total}건의 엑셀 데이터를 정상적으로 분석했습니다!`);
      } catch (err: any) {
        alert('엑셀 분석 중 오류가 발생했습니다: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // 5. PATCH 업데이트
  async function patch(path: string, body: any) {
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(body) });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 6. 매장 신규 등록
  async function addStore(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const payload = Object.fromEntries(f);
      payload.is_active = payload.is_active === 'true' ? ('true' as any) : ('false' as any);
      await api('stores', { method: 'POST', body: JSON.stringify(payload) });
      e.currentTarget.reset();
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 7. 전화 상담 기록 등록
  async function consult(id: string) {
    const summary = prompt('전화 상담 내용을 입력하세요.');
    if (!summary) return;
    try {
      await api('consultations', {
        method: 'POST',
        body: JSON.stringify({ usage_application_id: id, summary, method: 'phone' }),
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 8. 대상자 CRM 상세 조회
  async function openParticipant(r: any) {
    try {
      const detail = await api('participants/' + r.identity_hash);
      setSelected({ ...r, detail });
    } catch (e: any) {
      alert('상세 정보를 불러오지 못했습니다: ' + e.message);
    }
  }

  // 9. 대상자 메모 추가
  async function addNote() {
    const note = prompt('대상자 메모를 입력하세요.');
    if (!note || !selected) return;
    const urgent = confirm('긴급 표시 메모로 등록할까요?');
    try {
      await api('participant-notes', {
        method: 'POST',
        body: JSON.stringify({ identity_hash: selected.identity_hash, note, is_urgent: urgent }),
      });
      await openParticipant(selected);
      await load('crm');
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 10. 지원 이력 수동 추가
  async function addSupport() {
    if (!selected) return;
    const app = selected.detail?.applications?.[0];
    if (!app) {
      alert('연결할 이용신청 내역이 없습니다.');
      return;
    }
    const item = prompt('지원 물품 또는 서비스명을 입력하세요.');
    if (!item) return;
    const qty = prompt('수량을 입력하세요.', '1');
    try {
      await api('support-records', {
        method: 'POST',
        body: JSON.stringify({
          identity_hash: selected.identity_hash,
          usage_application_id: app.id,
          store_id: app.store_id,
          item_name: item,
          quantity: Number(qty) || 1,
        }),
      });
      await openParticipant(selected);
      await load('crm');
    } catch (e: any) {
      alert(e.message);
    }
  }

  // 데이터 필터링 (검색어)
  const filtered = useMemo(() => {
    if (!Array.isArray(data)) return data;
    if (!query.trim()) return data;
    return data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  }, [data, query]);

  // 로그인 폼
  if (!token) {
    return (
      <main className="admin-login">
        <form className="panel" onSubmit={login}>
          <h1>온스토어 관리자 로그인</h1>
          <p>Supabase Auth에 등록된 관리자 계정으로 로그인합니다.</p>
          <input
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
          <button type="submit">로그인</button>
          {msg && <p className="error">{msg}</p>}
          <a href="/">홈으로 돌아가기</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {/* 사이드바 메인 탭 메뉴 */}
      <aside>
        <h2>온스토어 관리</h2>
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {labels[t]}
          </button>
        ))}
        <button
          className="logout-btn"
          onClick={async () => {
            if (supabase) await supabase.auth.signOut();
            setToken('');
          }}
        >
          로그아웃
        </button>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <section className="admin-content">
        {msg && <div className="error-box">{msg}</div>}

        {/* 1. 대시보드 */}
        {tab === 'dashboard' && data && (
          <>
            <h1>운영 현황</h1>
            <div className="stats">
              <Stat n={data.stores || 0} t="전체 매장" />
              <Stat n={data.pendingVendors || 0} t="업체신청 대기" />
              <Stat n={data.pendingUsage || 0} t="이용신청 대기" />
              <Stat n={data.pendingSuggestions || 0} t="건의사항 대기" />
              <Stat n={data.consultations || 0} t="상담기록" />
            </div>
          </>
        )}

        {/* 2. 통계 분석 */}
        {tab === 'analytics' && (
          <>
            <h1>통계 분석</h1>
            <p>기간별 온스토어 이용현황을 확인하고 CSV 다운로드 및 엑셀 업로드가 가능합니다.</p>
            <div className="analytics-filter" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                시작일
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label>
                종료일
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <button onClick={() => load('analytics')}>조회</button>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    const r = await fetch(
                      `/api/admin/analytics/export?from=${dateFrom}&to=${dateTo}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (!r.ok) {
                      alert('다운로드에 실패했습니다.');
                      return;
                    }
                    const b = await r.blob();
                    const u = URL.createObjectURL(b);
                    const a = document.createElement('a');
                    a.href = u;
                    a.download = `onstore-statistics-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(u);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
              >
                CSV 다운로드
              </button>

              {/* ✨ 새로 추가된 엑셀/CSV 업로드 버튼 */}
              <label
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginLeft: 'auto',
                }}
              >
                📁 엑셀/CSV 데이터 넣기
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {data && (
              <>
                <div className="stats analytics-stats">
                  <Stat n={data.summary?.applications || 0} t="총 신청" />
                  <Stat n={data.summary?.uniqueParticipants || 0} t="고유 이용자" />
                  <Stat n={data.summary?.completed || 0} t="지원 완료" />
                  <Stat n={data.summary?.supports || 0} t="지원 기록" />
                  <Stat n={(data.summary?.completionRate || 0) + '%'} t="완료율" />
                </div>
                <div className="analytics-grid">
                  <BarChart title="월별 신청" rows={data.monthly || []} />
                  <BarChart title="동별 이용" rows={data.district || []} />
                  <BarChart title="연령대별" rows={data.age || []} />
                  <BarChart title="성별" rows={data.gender || []} />
                  <BarChart title="주요 지원품목" rows={data.items || []} />
                  <BarChart title="업체별 신청" rows={data.storeUsage || []} />
                </div>
                <p className="analytics-note">
                  생성 시각: {data.generatedAt ? new Date(data.generatedAt).toLocaleString('ko-KR') : '-'}
                </p>
              </>
            )}
          </>
        )}

        {/* 3. 대상자 CRM */}
        {tab === 'crm' && (
          <>
            <h1>대상자 CRM</h1>
            <p>동일 이름·생년월일은 하나의 대상자로 묶어 이용 및 지원이력을 확인합니다.</p>
            <input
              className="crm-search"
              placeholder="이름, 동, 연락처 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Table
              rows={filtered || []}
              cols={['participant_name', 'birth_date', 'dong', 'application_count', 'support_count', 'last_used_at', 'urgent']}
              action={(r: any) => <button onClick={() => openParticipant(r)}>상세보기</button>}
            />
            {selected && (
              <ParticipantDetail
                person={selected}
                onClose={() => setSelected(null)}
                onNote={addNote}
                onSupport={addSupport}
              />
            )}
          </>
        )}

        {/* 4. 매장 관리 */}
        {tab === 'stores' && (
          <>
            <h1>매장 관리</h1>
            <form className="store-form" onSubmit={addStore}>
              <input name="name" placeholder="매장명" required />
              <select name="store_type">
                <option value="onstore">온스토어</option>
                <option value="justdream">그냥드림</option>
              </select>
              <input name="category" placeholder="업종" required />
              <input name="address" placeholder="주소" required />
              <input name="latitude" type="number" step="any" placeholder="위도" required />
              <input name="longitude" type="number" step="any" placeholder="경도" required />
              <input name="phone" placeholder="전화번호" />
              <input name="business_hours" placeholder="영업시간" />
              <input name="available_items" placeholder="제공물품 (쉼표 구분)" />
              <label>
                <input name="is_active" type="checkbox" value="true" defaultChecked /> 공개
              </label>
              <button type="submit">매장 등록</button>
            </form>
            <Table
              rows={data || []}
              cols={['name', 'store_type', 'category', 'address', 'is_active']}
              action={(r: any) => (
                <button onClick={() => patch('stores', { id: r.id, is_active: !r.is_active })}>
                  {r.is_active ? '비공개' : '공개'}
                </button>
              )}
            />
          </>
        )}

        {/* 5. 업체 신청 */}
        {tab === 'vendors' && (
          <>
            <h1>업체 참여 신청</h1>
            <Table
              rows={data || []}
              cols={['business_name', 'representative_name', 'category', 'phone', 'address', 'status']}
              action={(r: any) => (
                <select
                  value={r.status}
                  onChange={(e) =>
                    patch('vendor-applications', {
                      id: r.id,
                      status: e.target.value,
                      admin_memo: r.admin_memo,
                    })
                  }
                >
                  {['received', 'reviewing', 'approved', 'rejected', 'closed'].map((s) => (
                    <option value={s} key={s}>
                      {statusKo[s] || s}
                    </option>
                  ))}
                </select>
              )}
            />
          </>
        )}

        {/* 6. 이용 신청 */}
        {tab === 'usage' && (
          <>
            <h1>대상자 이용 신청</h1>
            <Table
              rows={data || []}
              cols={['participant_name', 'birth_date', 'phone', 'dong', 'address', 'status']}
              action={(r: any) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={r.status}
                    onChange={(e) => patch('usage-applications', { id: r.id, status: e.target.value })}
                  >
                    {['received', 'reviewing', 'approved', 'completed', 'rejected'].map((s) => (
                      <option value={s} key={s}>
                        {statusKo[s] || s}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => consult(r.id)}>상담기록</button>
                </div>
              )}
            />
          </>
        )}

        {/* 7. 건의사항 */}
        {tab === 'suggestions' && (
          <>
            <h1>건의사항</h1>
            <Table
              rows={data || []}
              cols={['category', 'district', 'content', 'contact_phone', 'status']}
              action={(r: any) => (
                <button
                  onClick={async () => {
                    const reply = prompt('답변을 입력하세요.', r.admin_reply || '');
                    if (reply !== null) {
                      await patch('suggestions', { id: r.id, status: 'answered', admin_reply: reply });
                    }
                  }}
                >
                  답변
                </button>
              )}
            />
          </>
        )}
      </section>
    </main>
  );
}

// 서브 컴포넌트들
function BarChart({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const list = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, ...list.map((r) => r.value));
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      {list.length ? (
        list.map((r) => (
          <div className="bar-row" key={r.label}>
            <span title={r.label}>{r.label}</span>
            <div>
              <i style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}></i>
            </div>
            <b>{r.value}</b>
          </div>
        ))
      ) : (
        <p>집계 자료가 없습니다.</p>
      )}
    </article>
  );
}

function Stat({ n, t }: { n: number | string; t: string }) {
  return (
    <article>
      <strong>{n}</strong>
      <span>{t}</span>
    </article>
  );
}

function Table({ rows, cols, action }: { rows: any[]; cols: string[]; action: (r: any) => any }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>처리</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id || r.identity_hash}>
              {cols.map((c) => (
                <td key={c}>
                  {c === 'status'
                    ? statusKo[r[c]] || r[c]
                    : c === 'urgent'
                    ? r[c]
                      ? '🚨 긴급'
                      : '-'
                    : c === 'last_used_at'
                    ? r[c]
                      ? new Date(r[c]).toLocaleDateString('ko-KR')
                      : '없음'
                    : String(r[c] ?? '')}
                </td>
              ))}
              <td className="actions">{action(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && <p style={{ padding: '20px', textAlign: 'center', color: '#888' }}>등록된 자료가 없습니다.</p>}
    </div>
  );
}

function ParticipantDetail({
  person,
  onClose,
  onNote,
  onSupport,
}: {
  person: any;
  onClose: () => void;
  onNote: () => void;
  onSupport: () => void;
}) {
  const d = person.detail || { supports: [], notes: [], applications: [] };
  return (
    <div className="crm-modal">
      <div className="crm-card">
        <button className="close" onClick={onClose}>
          닫기
        </button>
        <h2>
          {person.urgent ? '🚨 ' : ''}
          {person.participant_name}
        </h2>
        <p>
          {person.birth_date} · {person.dong} · {person.phone}
        </p>
        <div className="crm-actions">
          <button onClick={onNote}>메모 추가</button>
          <button onClick={onSupport}>지원이력 추가</button>
        </div>

        <h3>지원이력</h3>
        {(d.supports || []).map((x: any) => (
          <p key={x.id}>
            <b>{new Date(x.support_date).toLocaleDateString('ko-KR')}</b> {x.item_name} {x.quantity}개 ·{' '}
            {x.stores?.name || ''}
          </p>
        ))}
        {!(d.supports || []).length && <p className="empty">지원이력이 없습니다.</p>}

        <h3>관리자 메모</h3>
        {(d.notes || []).map((x: any) => (
          <p key={x.id} className={x.is_urgent ? 'urgent-note' : ''}>
            {x.is_urgent ? '[긴급] ' : ''}
            {x.note} · {x.admin_users?.name || ''}
          </p>
        ))}
        {!(d.notes || []).length && <p className="empty">메모가 없습니다.</p>}

        <h3>신청 및 상담 연결정보</h3>
        {(d.applications || []).map((x: any) => (
          <p key={x.id}>
            {new Date(x.created_at).toLocaleDateString('ko-KR')} · {statusKo[x.status] || x.status} ·{' '}
            {x.stores?.name || ''} · {x.provided_items || '물품 미기재'}
          </p>
        ))}
      </div>
    </div>
  );
}