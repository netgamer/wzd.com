export type SiteLanguage = "ko" | "en";

const SITE_LANGUAGE_STORAGE_KEY = "wzd-site-language";

export const getStoredSiteLanguage = (): SiteLanguage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
  return value === "ko" || value === "en" ? value : null;
};

export const getInitialSiteLanguage = (): SiteLanguage => {
  const stored = getStoredSiteLanguage();
  if (stored) {
    return stored;
  }

  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ko")) {
    return "ko";
  }

  return "en";
};

export const persistSiteLanguage = (language: SiteLanguage) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
};
