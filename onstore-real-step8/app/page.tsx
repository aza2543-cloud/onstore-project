import StoreExplorer from './components/StoreExplorer';
import StepTwoServices from './components/StepTwoServices';

export default function HomePage() {
  return (
    <main>
      <header className="topbar">
        <div className="container topbar-inner">
          <div>
            <p className="eyebrow">심곡동종합사회복지관</p>
            <h1>온(溫)스토어</h1>
          </div>
          <nav className="topnav">
            <a href="#map">매장 찾기</a>
            <a href="#participate">업체 신청</a>
            <a href="#suggestion">건의사항</a>
            <a href="#faq">FAQ</a>
            {/* 사장님용 로그인 및 신청서 작성 페이지 */}
            <a href="/apply" className="highlight">참여업체 페이지</a>
            {/* 복지관 관리자 페이지 */}
            <a href="/admin">관리자 페이지</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill">이웃의 따뜻한 나눔을 가까이에서</span>
            <h2>내 주변 온스토어와<br />그냥드림을 찾아보세요.</h2>
            <p>매장별 업종 운영시간 주소 제공 물품을 확인하고 길찾기와 공유 기능을 이용할 수 있습니다.</p>
            <a className="primary-button" href="#map">지도에서 찾기</a>
          </div>
          <div className="hero-card" aria-hidden="true">
            <div className="heart">溫</div>
            <strong>따뜻함을 나누는 우리 동네 가게</strong>
            <span>심곡1·2·3동 원미2동 소사동</span>
          </div>
        </div>
      </section>

      <section id="about" className="section container">
        <div className="section-heading">
          <p className="eyebrow">사업 소개</p>
          <h2>온스토어란?</h2>
        </div>
        <div className="info-grid">
          <article className="info-card">
            <b>온(溫)스토어</b>
            <p>지역 상점과 복지관이 함께 위기가구를 발굴하고 생필품 지원 및 복지서비스를 연계하는 사업입니다.</p>
          </article>
          <article className="info-card">
            <b>그냥드림</b>
            <p>생활에 어려움이 있는 주민이 필요한 먹거리와 생필품을 지원받을 수 있도록 안내하는 사업입니다.</p>
          </article>
          <article className="info-card">
            <b>이용 안내</b>
            <p>참여 매장에서 대상자를 확인한 후 신청서를 작성하고 필요한 생필품을 지원합니다. 방문 전 매장 운영정보를 확인해 주세요.</p>
          </article>
        </div>
      </section>

      <section id="map" className="section soft-bg">
        <div className="container">
          <StoreExplorer />
        </div>
      </section>

      <StepTwoServices />

      <footer>
        <div className="container footer-inner">
          <div>
            <strong>심곡동종합사회복지관</strong>
            <p>온(溫)스토어 안내 플랫폼</p>
          </div>
          <p>운영정보는 복지관 관리자 확인 후 게시됩니다.</p>
        </div>
      </footer>
    </main>
  );
}