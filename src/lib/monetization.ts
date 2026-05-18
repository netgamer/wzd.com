// 수익화 설정 — 환경변수 기반. 값 없으면 자동으로 비활성화되어
// 일반 사용자에게는 아무것도 안 보임.

const trim = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const BMC_USERNAME = trim(import.meta.env.VITE_BMC_USERNAME);
export const ADSENSE_CLIENT_ID = trim(import.meta.env.VITE_ADSENSE_CLIENT_ID);
export const STRIPE_PAYMENT_URL = trim(import.meta.env.VITE_STRIPE_PAYMENT_URL);
export const TOSS_USERNAME = trim(import.meta.env.VITE_TOSS_USERNAME);
export const KAKAOPAY_URL = trim(import.meta.env.VITE_KAKAOPAY_URL);
export const BANK_ACCOUNT = trim(import.meta.env.VITE_BANK_ACCOUNT); // "은행 / 예금주 / 계좌번호" 형식 자유

export interface SupportChannel {
  id: string;
  label: string;
  emoji: string;
  description: string;
  href?: string;
  copyText?: string;
}

export const getSupportChannels = (): SupportChannel[] => {
  const out: SupportChannel[] = [];
  if (BMC_USERNAME) {
    out.push({
      id: "bmc",
      label: "Buy Me a Coffee",
      emoji: "☕",
      description: "글로벌 카드 결제 · ~$1부터",
      href: `https://www.buymeacoffee.com/${BMC_USERNAME}`
    });
  }
  if (STRIPE_PAYMENT_URL) {
    out.push({
      id: "stripe",
      label: "카드 결제 (Stripe)",
      emoji: "💳",
      description: "글로벌 카드 즉시 결제",
      href: STRIPE_PAYMENT_URL
    });
  }
  if (TOSS_USERNAME) {
    out.push({
      id: "toss",
      label: "토스 송금",
      emoji: "💸",
      description: "토스 사용자에게 즉시",
      href: `https://toss.me/${TOSS_USERNAME}`
    });
  }
  if (KAKAOPAY_URL) {
    out.push({
      id: "kakaopay",
      label: "카카오페이 송금",
      emoji: "💛",
      description: "카카오톡으로 즉시 송금",
      href: KAKAOPAY_URL
    });
  }
  if (BANK_ACCOUNT) {
    out.push({
      id: "bank",
      label: "계좌이체",
      emoji: "🏦",
      description: BANK_ACCOUNT,
      copyText: BANK_ACCOUNT
    });
  }
  return out;
};

export const hasAnySupportChannel = (): boolean => getSupportChannels().length > 0;
export const hasBmc = (): boolean => Boolean(BMC_USERNAME);
export const bmcUrl = (): string => (BMC_USERNAME ? `https://www.buymeacoffee.com/${BMC_USERNAME}` : "");

let adsenseInjected = false;

export const injectAdSense = (): void => {
  if (typeof document === "undefined") return;
  if (!ADSENSE_CLIENT_ID) return;
  if (adsenseInjected) return;
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

export const hasAdSense = (): boolean => Boolean(ADSENSE_CLIENT_ID);
