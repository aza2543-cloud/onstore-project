'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const faqs = [
  { q: '온스토어는 누가 이용할 수 있나요?', a: '심곡동종합사회복지관의 상담과 확인을 거쳐 지원이 필요한 주민이 이용할 수 있습니다. 세부 기준은 가구 상황과 사업 운영 기준에 따라 달라질 수 있습니다.' },
  { q: '그냥드림과 온스토어는 무엇이 다른가요?', a: '온스토어는 지역 상점과 복지관이 물품과 서비스를 연결하는 체계이며 그냥드림은 먹거리와 생필품 지원 정보를 안내하는 사업입니다.' },
  { q: '매장에 바로 방문하면 지원받을 수 있나요?', a: '지원 대상 확인과 이용 절차가 필요한 경우가 있으므로 방문 전 복지관 또는 해당 매장에 문의해 주세요.' },
  { q: '업체 참여 신청 후 바로 지도에 표시되나요?', a: '아닙니다. 복지관 담당자가 신청 내용을 확인하고 유선 상담과 협의를 진행한 뒤 승인된 업체만 공개됩니다.' },
  { q: '건의사항에 답변을 받을 수 있나요?', a: '답변 요청을 선택하고 연락처와 개인정보 동의를 입력하면 담당자가 확인 후 연락하거나 게시판 답변을 남겨드립니다.' },
];

const quickQuestions = ['이용 대상', '업체 참여', '매장 방문', '그냥드림 차이', '건의 답변'];

function chatbotAnswer(input: string) {
  const q = input.replace(/\s/g, '').toLowerCase();
  if (q.includes('대상') || q.includes('누가') || q.includes('자격')) return faqs[0].a;
  if (q.includes('그냥드림') || q.includes('차이')) return faqs[1].a;
  if (q.includes('방문') || q.includes('이용방법') || q.includes('신청방법')) return faqs[2].a;
  if (q.includes('업체') || q.includes('사장') || q.includes('참여')) return faqs[3].a;
  if (q.includes('건의') || q.includes('답변') || q.includes('문의')) return faqs[4].a;
  if (q.includes('지역')) return '현재 주요 운영 지역은 심곡1동 심곡2동 심곡3동 원미2동 소사동입니다. 사업별 세부 이용 가능 지역은 복지관 확인이 필요합니다.';
  return '해당 질문은 자동 안내 범위를 벗어났습니다. 업체 참여 신청 또는 건의사항을 남겨 주시면 담당자가 확인할 수 있습니다.';
}

interface SuggestionItem {
  id: string;
  category: string;
  district: string;
  content: string;
  created_at: string;
  is_secret: boolean;
  reply_content?: string;
  replied_at?: string;
  status?: string;
}

export default function StepTwoServices() {
  const [vendorMessage, setVendorMessage] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [vendorBusy, setVendorBusy] = useState(false);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'bot', text: '안녕하세요. 온스토어 이용과 업체 참여에 관한 간단한 질문에 답변해 드립니다.' }]);
  const chatbotStatus = useMemo(() => `${messages.length}개의 대화`, [messages.length]);

  // 비밀글 폼 제어용 State
  const [isSecret, setIsSecret] = useState(false);

  // 건의사항 목록 및 비밀번호 확인용 State
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Record<string, boolean>>({});
  const [inputPasswords, setInputPasswords] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // 건의사항 목록 불러오기
  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/suggestions');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.data || []);
      }
    } catch (e) {
      console.error('건의사항 목록 로드 실패', e);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function submitVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVendorBusy(true); setVendorMessage('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    Object.assign(body, { privacyAgreed: data.get('privacyAgreed') === 'on' });
    try {
      const response = await fetch('/api/vendor-applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setVendorMessage(`신청이 접수되었습니다. 접수번호: ${result.receiptId.slice(0, 8).toUpperCase()}`);
      form.reset();
    } catch (error) { setVendorMessage(error instanceof Error ? error.message : '신청 접수 중 오류가 발생했습니다.'); }
    finally { setVendorBusy(false); }
  }

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggestionBusy(true); setSuggestionMessage('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    Object.assign(body, { 
      replyRequested: data.get('replyRequested') === 'on', 
      privacyAgreed: data.get('privacyAgreed') === 'on',
      isSecret: isSecret
    });

    try {
      const response = await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSuggestionMessage(`건의사항이 접수되었습니다. 목록에서 답변을 확인하실 수 있습니다.`);
      form.reset();
      setIsSecret(false);
      fetchSuggestions(); // 제출 후 목록 새로고침
    } catch (error) { setSuggestionMessage(error instanceof Error ? error.message : '건의사항 접수 중 오류가 발생했습니다.'); }
    finally { setSuggestionBusy(false); }
  }

  // 비밀글 잠금 해제 확인
  const handleUnlock = async (id: string) => {
    const pwd = inputPasswords[id];
    if (!pwd) {
      setPasswordErrors(prev => ({ ...prev, [id]: '비밀번호를 입력해 주세요.' }));
      return;
    }

    try {
      const res = await fetch(`/api/suggestions/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pwd })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnlockedIds(prev => ({ ...prev, [id]: true }));
        setPasswordErrors(prev => ({ ...prev, [id]: '' }));
      } else {
        setPasswordErrors(prev => ({ ...prev, [id]: '비밀번호가 일치하지 않습니다.' }));
      }
    } catch {
      setPasswordErrors(prev => ({ ...prev, [id]: '확인 중 오류가 발생했습니다.' }));
    }
  };

  function sendChat(text = chatInput) {
    const value = text.trim();
    if (!value) return;
    setMessages((current) => [...current, { role: 'user', text: value }, { role: 'bot', text: chatbotAnswer(value) }]);
    setChatInput('');
  }

  return (
    <>
      <section id="participate" className="section container">
        <div className="section-heading"><p className="eyebrow">지역 업체와 함께</p><h2>온스토어 참여 신청</h2><p className="section-description">신청 접수 후 복지관 담당자가 내용을 확인하고 연락드립니다. 제출만으로 참여가 확정되지는 않습니다.</p></div>
        <form className="application-form" onSubmit={submitVendor}>
          <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className="form-grid">
            <label>업체명 *<input name="businessName" required maxLength={100} /></label>
            <label>대표자명 *<input name="representativeName" required maxLength={50} /></label>
            <label>업종 *<input name="category" required maxLength={60} placeholder="예: 음식점 세탁소 마트" /></label>
            <label>연락처 *<input name="phone" required inputMode="tel" placeholder="032-000-0000" /></label>
            <label>이메일<input name="email" type="email" maxLength={120} /></label>
            <label>영업시간<input name="businessHours" maxLength={120} placeholder="예: 월~금 09:00~18:00" /></label>
            <label className="full">업체 주소 *<input name="address" required maxLength={200} /></label>
            <label className="full">제공 가능한 물품 또는 서비스 *<textarea name="availableItems" required maxLength={500} rows={4} /></label>
            <label className="full">참여 희망 사유<textarea name="motivation" maxLength={1000} rows={4} /></label>
          </div>
          <div className="privacy-box"><strong>개인정보 수집 및 이용 안내</strong><p>수집 항목: 대표자명 연락처 이메일 업체 주소. 이용 목적: 참여 신청 확인 및 상담. 보유 기간은 복지관 내부 기준과 관계 법령에 따라 설정하며 목적 달성 후 파기해야 합니다.</p><label className="check-label"><input type="checkbox" name="privacyAgreed" required /> 위 내용을 확인하고 동의합니다.</label></div>
          <button className="primary-button" disabled={vendorBusy}>{vendorBusy ? '접수 중...' : '업체 참여 신청하기'}</button>
          {vendorMessage && <p className="form-message" role="status">{vendorMessage}</p>}
        </form>
      </section>

      <section id="suggestion" className="section soft-bg"><div className="container">
        <div className="section-heading"><p className="eyebrow">주민 의견</p><h2>건의사항 남기기</h2><p className="section-description">필요한 업종, 지역, 개선점 등을 알려 주세요. 비밀글을 선택하시면 작성자와 관리자만 답변을 확인할 수 있습니다.</p></div>
        <form className="application-form" onSubmit={submitSuggestion}>
          <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className="form-grid">
            <label>건의 유형 *<select name="category" required defaultValue=""><option value="" disabled>선택</option><option>필요 업종</option><option>필요 지역</option><option>이용 불편</option><option>사업 개선</option><option>기타</option></select></label>
            <label>관련 지역<select name="district" defaultValue="기타"><option>심곡1동</option><option>심곡2동</option><option>심곡3동</option><option>원미2동</option><option>소사동</option><option>기타</option></select></label>
            <label className="full">건의 내용 *<textarea name="content" required maxLength={1500} rows={5} placeholder="개선점이나 필요한 서비스 내용을 적어주세요." /></label>
            <label>답변 연락처<input name="contactPhone" inputMode="tel" maxLength={13} placeholder="010-0000-0000 (필수)" /></label>
            
            {/* 비밀글 설정 부분 */}
            {isSecret && (
              <label>비밀번호 (4자리) *
                <input name="password" type="password" required maxLength={4} placeholder="비밀번호 4자리" />
              </label>
            )}
          </div>

          <label className="check-label">
            <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} /> 
            🔒 비밀글로 작성하기 (체크 시 설정한 비밀번호로만 답변을 볼 수 있습니다)
          </label>
          <label className="check-label"><input type="checkbox" name="replyRequested" /> 담당자 답변을 요청합니다.</label>
          <label className="check-label"><input type="checkbox" name="privacyAgreed" /> 연락처 입력 시 개인정보 수집 및 이용에 동의합니다.</label>
          <button className="primary-button" disabled={suggestionBusy}>{suggestionBusy ? '접수 중...' : '건의사항 제출하기'}</button>
          {suggestionMessage && <p className="form-message" role="status">{suggestionMessage}</p>}
        </form>

        {/* 📋 건의사항 및 답변 목록 게시판 */}
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>💬 작성된 건의사항 & 답변</h3>
          {suggestions.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>등록된 건의사항이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestions.map((s) => {
                const isLocked = s.is_secret && !unlockedIds[s.id];
                return (
                  <div key={s.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 'bold', marginRight: '8px' }}>[{s.category}]</span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.district}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: s.reply_content ? '#d1fae5' : '#f3f4f6',
                        color: s.reply_content ? '#065f46' : '#374151',
                        fontWeight: 'bold'
                      }}>
                        {s.reply_content ? '답변 완료' : '답변 대기'}
                      </span>
                    </div>

                    {/* 내용 또는 비밀번호 열람 */}
                    {isLocked ? (
                      <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#4b5563' }}>🔒 비밀글입니다. 설정하신 비밀번호를 입력해 주세요.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="password" 
                            placeholder="비밀번호" 
                            maxLength={4}
                            value={inputPasswords[s.id] || ''} 
                            onChange={(e) => setInputPasswords({ ...inputPasswords, [s.id]: e.target.value })}
                            style={{ width: '120px', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleUnlock(s.id)} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            확인
                          </button>
                        </div>
                        {passwordErrors[s.id] && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{passwordErrors[s.id]}</p>}
                      </div>
                    ) : (
                      <div>
                        <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0', fontSize: '0.95rem', color: '#1f2937' }}>{s.content}</p>
                        
                        {/* 관리자 답변 영역 */}
                        {s.reply_content && (
                          <div style={{ marginTop: '12px', background: '#f0fdf4', borderLeft: '4px solid #10b981', padding: '12px', borderRadius: '4px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#047857' }}>🏢 복지관 관리자 답변</strong>
                            <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0 0', fontSize: '0.9rem', color: '#064e3b' }}>{s.reply_content}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div></section>

      <section id="faq" className="section container"><div className="two-column">
        <div><div className="section-heading"><p className="eyebrow">자주 묻는 질문</p><h2>FAQ</h2></div><div className="faq-list">{faqs.map((item, index) => <article className="faq-item" key={item.q}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{item.q}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index && <p>{item.a}</p>}</article>)}</div></div>
        <div className="chat-card"><div className="chat-header"><div><p className="eyebrow">자동 안내</p><h2>온스토어 챗봇</h2></div><small>{chatbotStatus}</small></div><div className="quick-chat">{quickQuestions.map((q) => <button type="button" key={q} onClick={() => sendChat(q)}>{q}</button>)}</div><div className="chat-log" aria-live="polite">{messages.map((message, index) => <p key={index} className={`chat-message ${message.role}`}>{message.text}</p>)}</div><div className="chat-input"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} placeholder="질문을 입력하세요" /><button type="button" className="primary-button" onClick={() => sendChat()}>전송</button></div><p className="chat-note">자동 답변은 일반 안내이며 실제 지원 여부는 복지관 확인이 필요합니다.</p></div>
      </div></section>
    </>
  );
}