"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import mr from "@/messages/mr.json";
import te from "@/messages/te.json";
import ta from "@/messages/ta.json";
import gu from "@/messages/gu.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import pt from "@/messages/pt.json";
import de from "@/messages/de.json";
import { useSettingsStore } from "@/lib/stores";

export type Locale = "en" | "hi" | "mr" | "te" | "ta" | "gu" | "es" | "fr" | "pt" | "de";

export const locales: Locale[] = ["en", "hi", "mr", "te", "ta", "gu", "es", "fr", "pt", "de"];

const rtlLocales: Locale[] = [];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  te: "తెలుగు",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
  es: "Español",
  fr: "Français",
  pt: "Português",
  de: "Deutsch",
};

const messages: Record<Locale, typeof en> = {
  en,
  hi,
  mr,
  te,
  ta,
  gu,
  es,
  fr,
  pt,
  de,
};

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof en>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "pos_language";

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc?.[part], obj) ?? path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const fontScale = useSettingsStore((s) => s.fontScale);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(fontScale));
  }, [fontScale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const message = getNestedValue(messages[locale], key);
      if (!message || typeof message !== "string") return key;

      if (params) {
        return message.replace(
          /\{(\w+)\}/g,
          (_, paramKey) => String(params[paramKey] ?? `{${paramKey}}`)
        );
      }
      return message;
    },
    [locale]
  );

  const dir: "ltr" | "rtl" = rtlLocales.includes(locale) ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useLocale() {
  const { locale } = useI18n();
  return locale;
}

export function useSetLocale() {
  const { setLocale } = useI18n();
  return setLocale;
}

export function useTranslation(): (key: string, params?: Record<string, string | number>) => string {
  const { t } = useI18n();
  return t;
}
