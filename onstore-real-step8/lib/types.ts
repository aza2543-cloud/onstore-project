// 신청서 형태: 'general'(일반형) 또는 'agency'(거점형)만 가능
export type ApplicationType = 'general' | 'agency';

// 처리 상태: 'pending'(대기중), 'approved'(승인), 'rejected'(거절)만 가능
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// DB에 저장될 신청서 1건의 형태 규격서
export interface StoreApplication {
  id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  store_name: string;
  
  // 일반형 입력 항목들 (? 표시는 값이 없을 수도 있다는 뜻)
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