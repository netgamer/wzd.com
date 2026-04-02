import { supabase } from "../../lib/supabase";

const LandingPage = () => {
  const handleGoogleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo">WZD</div>
          <button className="landing-login-btn" onClick={handleGoogleLogin}>
            Google로 시작하기
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <p className="landing-kicker">아이디어를 현실로</p>
            <h1 className="landing-title">
              생각을 정리하고,<br />
              바로 실행하세요
            </h1>
            <p className="landing-subtitle">
              메모, 링크, 이미지를 한 곳에 모아두고<br />
              언제 어디서든 빠르게 찾아보세요
            </p>
            <div className="landing-cta">
              <button className="landing-cta-primary" onClick={handleGoogleLogin}>
                무료로 시작하기
              </button>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-features-inner">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">+</div>
              <h3>빠른 메모</h3>
              <p>생각나는 순간 바로 기록하세요. 텍스트, 링크, 이미지 무엇이든 저장합니다.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">*</div>
              <h3>스마트 정리</h3>
              <p>AI가 자동으로 분류하고 태그를 달아줍니다. 찾을 때도 검색 한 번이면 끝.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">&gt;</div>
              <h3>어디서든 접근</h3>
              <p>웹, 모바일 어디서든 동일하게. 클라우드 동기화로 끊김 없이 이어가세요.</p>
            </div>
          </div>
        </section>

        <section className="landing-showcase">
          <div className="landing-showcase-inner">
            <h2>당신의 두 번째 뇌</h2>
            <p>
              흩어진 정보를 한 곳에 모으세요.<br />
              WZD가 당신의 생각을 체계적으로 관리해 드립니다.
            </p>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-cta-inner">
            <h2>지금 바로 시작하세요</h2>
            <p>무료로 사용할 수 있습니다</p>
            <button className="landing-cta-primary" onClick={handleGoogleLogin}>
              Google로 시작하기
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">WZD</span>
          <span className="landing-footer-copy">2026 WZD. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
