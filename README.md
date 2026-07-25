# 온(溫)스토어 통합 운영 시스템 - 8단계

심곡동종합사회복지관 온스토어·그냥드림 안내, 참여업체 업무, 대상자 CRM, 문자 알림, 통계 분석을 포함한 Next.js + Supabase 운영형 프로젝트입니다.

## 8단계 추가 기능

- 기간별 통계 조회
- 총 신청, 고유 이용자, 지원 완료, 지원기록, 완료율 요약
- 월별 신청 추이
- 심곡1·2·3동, 원미2동, 소사동별 이용현황
- 연령대별·성별 이용현황
- 주요 지원품목 상위 10개
- 업체별 신청건수 상위 10개
- 관리자 인증 기반 CSV 다운로드
- 대량 집계를 위한 데이터베이스 인덱스

## 기존 7단계에서 업그레이드

Supabase SQL Editor에서 다음 파일을 실행합니다.

```text
supabase/step8_migration.sql
```

신규 설치는 `supabase/schema.sql` 전체를 실행합니다.

## 환경변수

`.env.example`을 `.env.local`로 복사하여 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
SMS_PROVIDER=mock
CRON_SECRET=
```

## 실행

```bash
npm install
npm run dev
```

- 일반 홈페이지: http://localhost:3000
- 참여업체: http://localhost:3000/store
- 관리자: http://localhost:3000/admin

관리자 로그인 후 `통계 분석` 메뉴를 선택합니다.

## 개인정보 유의사항

CSV에는 대상자 이름, 생년월일, 연락처, 주소가 포함될 수 있습니다. 관리자 권한이 있는 업무용 기기에서만 내려받고, 기관의 보유기간·암호화·파기 기준에 따라 관리해야 합니다.

## 검증 결과

Next.js 컴파일과 TypeScript 검사는 통과했습니다. 실행 환경 제한으로 빌드의 정적 페이지 생성 단계에서 EPIPE가 발생했으나 코드 컴파일 및 타입 오류는 확인되지 않았습니다.
