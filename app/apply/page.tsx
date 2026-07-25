'use client';

import { useEffect, useState } from 'react';
import { useKakaoPostcodePopup } from 'react-daum-postcode';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { ApplicationType } from '@/lib/types';

interface Store {
  id: string;
  name: string;
}

export default function ApplyPage() {
  const [supabase, setSupabase] = useState<any>(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loginMsg, setLoginMsg] = useState('');

  // 매장 목록 상태
  const [storeList, setStoreList] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  // 1. 탭 상태 ('general': 대상자용 일반형, 'agency': 기관용 거점형)
  const [tab, setTab] = useState<ApplicationType>('general');

  // 2. 대상자 중복 확인 상태 (일반형)
  const [participantName, setParticipantName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [checkResult, setCheckResult] = useState<{ checked: boolean; isDuplicate: boolean; msg: string }>({
    checked: false,
    isDuplicate: false,
    msg: '',
  });

  // 3. 공통 및 입력 폼 상태
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('남');
  const [dong, setDong] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [providedItems, setProvidedItems] = useState('');
  const [emergencyCare, setEmergencyCare] = useState('');
  const [supportReason, setSupportReason] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // 기관용(거점형) 추가 필드
  const [agencyName, setAgencyName] = useState('');
  const [department, setDepartment] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [targetCount, setTargetCount] = useState<number | ''>(1);
  const [amount, setAmount] = useState<number | ''>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kakao 우편번호 팝업 훅
  const openKakaoPostcode = useKakaoPostcodePopup();

  // Supabase Client 및 토큰 확인 + 매장 목록 불러오기
  useEffect(() => {
    const c = createSupabaseBrowserClient();
    setSupabase(c);
    c.auth.getSession().then(({ data }: any) => {
      const accessToken = data.session?.access_token || '';
      setToken(accessToken);
      if (accessToken) {
        fetchStores(accessToken);
      }
    });
  }, []);

  // 탭 변경 시 중복 검사 상태 초기화
  const handleTabChange = (nextTab: ApplicationType) => {
    setTab(nextTab);
    setCheckResult({ checked: false, isDuplicate: false, msg: '' });
  };

  // 등록된 참여업체(매장) 목록 불러오기
  async function fetchStores(authToken: string) {
    setIsLoadingStores(true);
    try {
      const res = await fetch('/api/admin/stores', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const storesData = Array.isArray(data) ? data : data.stores || [];
        setStoreList(storesData);
      }
    } catch (err) {
      console.error('매장 목록 불러오기 실패:', err);
    } finally {
      setIsLoadingStores(false);
    }
  }

  // 참여업체 로그인
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoginMsg('');
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (error) {
      setLoginMsg(error.message || '로그인에 실패했습니다.');
    } else {
      const accessToken = authData.session?.access_token || '';
      setToken(accessToken);
      setLoginMsg('');
      fetchStores(accessToken);
    }
  }

  // 카카오 우편번호 검색 완료 콜백 (관할지역 검증 및 차단 로직 포함)
  const handlePostcodeComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    const extractedDong = data.bname || data.hname || '';

    // 지정 관할지역 검증
    const validDongs = ['심곡동', '심곡1동', '심곡2동', '심곡3동', '원미2동', '소사동'];
    const isBucheon = fullAddress.includes('부천') || (data.sido?.includes('경기') && data.sigungu?.includes('부천'));

    const hasValidDong = validDongs.some(
      (validDong) => extractedDong.includes(validDong) || fullAddress.includes(validDong)
    );

    if (isBucheon && hasValidDong) {
      // ✅ 관할 대상: 주소 및 동 입력
      setAddress(fullAddress);
      setDong(extractedDong);
      alert(`✅ 관할 지원 대상 거주 지역(${extractedDong || '관할동'}) 인증이 완료되었습니다.`);
    } else {
      // ❌ 미대상: 기존 주소 초기화 및 차단
      setAddress('');
      setDong('');
      alert(
        `⚠️ 관할 지원 지역이 아닙니다.\n\n` +
          `• 선택한 주소: ${fullAddress}\n` +
          `• 추출된 동: ${extractedDong || '미확인'}\n\n` +
          `* 지원 가능 지역: 심곡1·2·3동, 심곡동, 원미2동, 소사동`
      );
    }
  };

  const handleSearchAddress = () => {
    if (typeof openKakaoPostcode === 'function') {
      openKakaoPostcode({ onComplete: handlePostcodeComplete });
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // 대상자 중복 확인
  async function handleCheckDuplicate(e: React.FormEvent) {
    e.preventDefault();
    if (!participantName || !birthDate) {
      alert('이름과 생년월일을 모두 입력해 주세요.');
      return;
    }

    if (!/^\d{8}$/.test(birthDate)) {
      alert('생년월일 8자리를 정확히 입력해 주세요. (예: 19900101)');
      return;
    }

    try {
      const res = await fetch('/api/participant-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: participantName,
          birthDate: birthDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '조회 중 오류가 발생했습니다.');
        return;
      }

      if (data.duplicate) {
        setCheckResult({
          checked: true,
          isDuplicate: true,
          msg: '⚠️ [중복] 이미 지원 이력이 있는 대상자입니다.',
        });
      } else {
        setCheckResult({
          checked: true,
          isDuplicate: false,
          msg: '✅ 신규 등록이 가능한 대상자입니다.',
        });
      }
    } catch (err) {
      console.error(err);
      alert('조회 처리 중 오류가 발생했습니다.');
    }
  }

  // 신청서 제출
  async function handleSubmitApply(e: React.FormEvent) {
    e.preventDefault();

    if (!storeName) {
      alert('참여업체(매장명)를 선택해 주세요.');
      return;
    }

    if (tab === 'general') {
      if (!checkResult.checked) {
        alert('먼저 대상자 중복 확인을 진행해 주세요.');
        return;
      }
      if (checkResult.isDuplicate) {
        alert('중복된 대상자는 신청서를 제출할 수 없습니다.');
        return;
      }
      if (!address) {
        alert('관할 지역 주소를 검색하여 선택해 주세요.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('type', tab);
      formData.append('storeName', storeName);
      formData.append('supportReason', supportReason);

      if (tab === 'general') {
        const fullAddressWithDetail = detailAddress ? `${address} ${detailAddress}` : address;

        formData.append('participantName', participantName);
        formData.append('birthDate', birthDate);
        formData.append('phone', phone);
        formData.append('gender', gender);
        formData.append('dong', dong);
        formData.append('address', fullAddressWithDetail);
        formData.append('providedItems', providedItems);
        formData.append('emergencyCare', emergencyCare);
        if (receiptFile) formData.append('receipt', receiptFile);
      } else {
        formData.append('agencyName', agencyName);
        formData.append('department', department);
        formData.append('managerName', managerName);
        formData.append('managerPhone', managerPhone);
        formData.append('targetCount', String(targetCount || 0));
        formData.append('amount', String(amount || 0));
      }

      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert('신청서가 성공적으로 접수되었습니다.');
        // 폼 초기화
        setParticipantName('');
        setBirthDate('');
        setStoreName('');
        setPhone('');
        setDong('');
        setAddress('');
        setDetailAddress('');
        setProvidedItems('');
        setEmergencyCare('');
        setSupportReason('');
        setReceiptFile(null);
        setAgencyName('');
        setDepartment('');
        setManagerName('');
        setManagerPhone('');
        setTargetCount(1);
        setAmount('');
        setCheckResult({ checked: false, isDuplicate: false, msg: '' });
      } else {
        alert('접수 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      alert('제출 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // 중복 검사 미진행 및 중복 대상자인 경우 제출 버튼 비활성화
  const isSubmitDisabled =
    isSubmitting || (tab === 'general' && (!checkResult.checked || checkResult.isDuplicate));

  if (!token) {
    return (
      <main
        style={{
          maxWidth: '400px',
          margin: '80px auto',
          padding: '24px',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          fontFamily: 'sans-serif',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
          참여업체 로그인
        </h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          등록된 사장님 계정으로 로그인해 주세요.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            type="submit"
            style={{
              padding: '12px',
              backgroundColor: '#2b8a3e',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
          {loginMsg && (
            <p style={{ color: '#e03131', fontSize: '14px', margin: 0, textAlign: 'center' }}>{loginMsg}</p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '768px', margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>참여업체 업무 센터</h1>
        <button
          onClick={async () => {
            if (supabase) await supabase.auth.signOut();
            setToken('');
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#868e96',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('general')}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '15px',
            fontWeight: 'bold',
            border: 'none',
            borderBottom: tab === 'general' ? '3px solid #2b8a3e' : 'none',
            color: tab === 'general' ? '#2b8a3e' : '#666',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          대상자용 (일반형)
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('agency')}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '15px',
            fontWeight: 'bold',
            border: 'none',
            borderBottom: tab === 'agency' ? '3px solid #2b8a3e' : 'none',
            color: tab === 'agency' ? '#2b8a3e' : '#666',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          기관용 (거점형)
        </button>
      </div>

      {tab === 'general' && (
        <section
          style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#2b8a3e' }}>
            1. 대상자 중복 확인
          </h2>
          <form onSubmit={handleCheckDuplicate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>대상자 이름 *</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={participantName}
                  onChange={(e) => {
                    setParticipantName(e.target.value);
                    setCheckResult({ checked: false, isDuplicate: false, msg: '' });
                  }}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>생년월일 (8자리) *</label>
                <input
                  type="text"
                  placeholder="예: 19900101"
                  maxLength={8}
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    setCheckResult({ checked: false, isDuplicate: false, msg: '' });
                  }}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{
                padding: '12px',
                backgroundColor: '#2b8a3e',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🔍 중복 조회하기
            </button>
          </form>

          {checkResult.checked && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '4px',
                backgroundColor: checkResult.isDuplicate ? '#fff5f5' : '#ebfbee',
                color: checkResult.isDuplicate ? '#e03131' : '#2b8a3e',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              {checkResult.msg}
            </div>
          )}
        </section>
      )}

      <section style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1864ab' }}>
          2. 이용 신청서 작성 ({tab === 'general' ? '일반형' : '거점형'})
        </h2>

        <form onSubmit={handleSubmitApply} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
              참여업체 (매장명) 선택 *
            </label>
            <select
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            >
              <option value="">-- 매장을 선택해 주세요 --</option>
              {isLoadingStores ? (
                <option value="" disabled>
                  매장 목록 불러오는 중...
                </option>
              ) : storeList.length > 0 ? (
                storeList.map((store) => (
                  <option key={store.id || store.name} value={store.name}>
                    {store.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  등록된 매장이 없습니다.
                </option>
              )}
            </select>
          </div>

          {tab === 'general' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    연락처 *
                  </label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    성별
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  >
                    <option value="남">남성</option>
                    <option value="여">여성</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  주소 *
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="주소 검색 버튼을 눌러주세요"
                    value={address}
                    readOnly
                    required
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: '#f8f9fa',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#ffe812',
                      color: '#000',
                      border: '1px solid #ffd43b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                    }}
                  >
                    🔍 카카오 주소 검색
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="상세주소 (동/호수 등)"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="관할 동 (자동입력)"
                    value={dong}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                      backgroundColor: '#f8f9fa',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  제공 물품 / 서비스 내용 *
                </label>
                <input
                  type="text"
                  placeholder="예: 생필품 세트, 식권 1매"
                  value={providedItems}
                  onChange={(e) => setProvidedItems(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  긴급돌봄 내역
                </label>
                <input
                  type="text"
                  placeholder="긴급돌봄 내역이 있을 경우 입력"
                  value={emergencyCare}
                  onChange={(e) => setEmergencyCare(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  지원 사유
                </label>
                <textarea
                  placeholder="지원 사유를 자유롭게 입력하세요"
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  영수증 / 증빙 사진 첨부
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}

          {tab === 'agency' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    기관명 *
                  </label>
                  <input
                    type="text"
                    placeholder="복지관/기관명"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    부서명
                  </label>
                  <input
                    type="text"
                    placeholder="사회복지팀"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    담당자명 *
                  </label>
                  <input
                    type="text"
                    placeholder="담당자 이름"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    담당자 연락처 *
                  </label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    지원 대상 수 (명) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                    지원 금액 (원) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>
                  지원 사유
                </label>
                <textarea
                  placeholder="지원 사유를 적어주세요"
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              marginTop: '12px',
              padding: '14px',
              backgroundColor: isSubmitDisabled ? '#adb5bd' : '#1864ab',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? '접수 처리 중...' : '신청서 제출하기'}
          </button>
        </form>
      </section>
    </main>
  );
}