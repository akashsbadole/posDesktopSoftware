import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "hi", "mr", "te", "ta", "gu"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  te: "తెలుగు",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
};

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  hi: "ltr",
  mr: "ltr",
  te: "ltr",
  ta: "ltr",
  gu: "ltr",
};

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale && locales.includes(locale as Locale) 
    ? locale as Locale 
    : 'en';
  
  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});
