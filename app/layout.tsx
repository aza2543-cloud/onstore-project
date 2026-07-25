import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: '온(溫)스토어 | 심곡동종합사회복지관',
  description: '지역 내 온스토어와 그냥드림 매장을 찾을 수 있는 안내 서비스입니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

  return (
    <html lang="ko">
      <body>
        {children}
        {/* 카카오 지도 SDK 스크립트 로드 */}
        {kakaoKey && (
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services,clusterer&autoload=false`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}