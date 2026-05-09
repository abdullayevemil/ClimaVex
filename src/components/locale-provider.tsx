"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type Dictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(normalizeLocale(window.localStorage.getItem("climavex-locale")));
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    return {
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem("climavex-locale", nextLocale);
      },
      dictionary: dictionaries[locale],
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }

  return context;
}
