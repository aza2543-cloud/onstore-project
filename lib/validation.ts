export const allowedDistricts = ['심곡1동', '심곡2동', '심곡3동', '원미2동', '소사동', '기타'] as const;

export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

export function isValidPhone(value: string): boolean {
  return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(value.replace(/\s/g, ''));
}

export function isValidEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
