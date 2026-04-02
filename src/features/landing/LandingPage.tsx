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

        <section className="landing-widgets">
          <div className="landing-widgets-inner">
            <div className="landing-section-header">
              <p className="landing-section-kicker">다양한 위젯</p>
              <h2>필요한 모든 도구가 한 곳에</h2>
              <p className="landing-section-desc">메모 외에도 다양한 위젯으로 일상을 관리하세요</p>
            </div>
            <div className="landing-widgets-grid">
              <div className="landing-widget-card">
                <div className="landing-widget-icon">RSS</div>
                <h4>RSS 리더</h4>
                <p>좋아하는 블로그와 뉴스를 한 곳에서</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">BM</div>
                <h4>북마크</h4>
                <p>중요한 링크를 깔끔하게 정리</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">TODO</div>
                <h4>할 일 목록</h4>
                <p>오늘 할 일을 체크리스트로</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">D-</div>
                <h4>디데이</h4>
                <p>중요한 날까지 남은 시간 확인</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">CAL</div>
                <h4>시간표</h4>
                <p>주간 일정을 한눈에</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">SUN</div>
                <h4>날씨</h4>
                <p>오늘의 날씨를 빠르게 확인</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">HOT</div>
                <h4>실시간 트렌드</h4>
                <p>지금 뜨는 키워드 모아보기</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">BOX</div>
                <h4>배송 추적</h4>
                <p>택배 배송 현황을 실시간으로</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">DOC</div>
                <h4>문서</h4>
                <p>긴 글도 깔끔하게 작성</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">FOCUS</div>
                <h4>집중 타이머</h4>
                <p>뽀모도로 기법으로 집중력 UP</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">MOOD</div>
                <h4>감정 기록</h4>
                <p>오늘의 기분을 간단히 기록</p>
              </div>
              <div className="landing-widget-card">
                <div className="landing-widget-icon">AI</div>
                <h4>AI 프롬프트</h4>
                <p>자주 쓰는 프롬프트 저장</p>
              </div>
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
