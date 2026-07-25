// 위치 정보 규격서
export interface UserLocation {
  latitude: number;
  longitude: number;
}

// 신청서 형태: 'general'(일반형) 또는 'agency'(거점형)만 가능
export type ApplicationType = 'general' | 'agency';

// 처리 상태: 'pending'(대기중), 'approved'(승인), 'rejected'(거절)만 가능
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// 매장 구분 타입
export type StoreType = 'onstore' | 'justdream';

// DB에 저장될 신청서 1건의 형태 규격서
export interface StoreApplication {
  id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  store_name: string;
  
  // 일반형 입력 항목들
  user_name?: string;
  birth_date?: string;
  address?: string;
  address_detail?: string;
  phone?: string;
  gender?: '남' | '여';
  emergency_care?: string;
  support_reason?: string;
  receipt_url?: string;
  
  // 거점형 입력 항목들
  agency_name?: string;
  department?: string;
  manager_name?: string;
  manager_phone?: string;
  target_count?: number;
  amount?: number;

  created_at: string;
  updated_at: string;
}

// 매장 정보 규격서
export interface Store {
  id: string;
  name: string;
  type?: StoreType;
  store_type: StoreType; // 👈 undefined 가능성을 제거하여 객체 인덱스 오류 방지
  category?: string;
  available_items?: string[];
  
  address?: string;
  
  // 좌표값 (위도, 경도)
  lat?: number;
  lng?: number;
  latitude: number;
  longitude: number;
  
  // 영업 및 상태 정보
  is_temporarily_closed?: boolean;
  closed_weekdays?: number[];
  open_time?: string;
  close_time?: string;
  business_hours?: string;
  holiday_note?: string; // 👈 153번 줄의 holiday_note 추가
  phone?: string;
  description?: string;
  is_active?: boolean;
}