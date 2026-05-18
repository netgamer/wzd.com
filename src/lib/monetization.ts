// 수익화 설정 — 환경변수 기반. 값 없으면 자동으로 비활성화되어
// 일반 사용자에게는 아무것도 안 보임.

export const BMC_USERNAME = (import.meta.env.VITE_BMC_USERNAME as string | undefined)?.trim() || "";
export const ADSENSE_CLIENT_ID = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim() || "";

let adsenseInjected = false;

export const injectAdSense = () => {
  if (typeof document === "undefined") return;
  if (!ADSENSE_CLIENT_ID) return;
  if (adsenseInjected) return;
  // 이미 페이지에 있으면 skip
  if (document.querySelector(`script[data-ad-client="${ADSENSE_CLIENT_ID}"]`)) {
    adsenseInjected = true;
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.adClient = ADSENSE_CLIENT_ID;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  document.head.appendChild(script);
  adsenseInjected = true;
};

export const hasBmc = () => Boolean(BMC_USERNAME);
export const hasAdSense = () => Boolean(ADSENSE_CLIENT_ID);

export const bmcUrl = () => (BMC_USERNAME ? `https://www.buymeacoffee.com/${BMC_USERNAME}` : "");
