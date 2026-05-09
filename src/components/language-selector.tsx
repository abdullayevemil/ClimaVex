"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeLabels, localeShortLabels, supportedLocales } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";

export function LanguageSelector() {
  const { locale, setLocale, dictionary } = useI18n();

  return (
    <Select value={locale} onValueChange={setLocale}>
      <SelectTrigger
        aria-label={dictionary.language}
        className="h-10 w-[92px] bg-white"
      >
        <Languages className="h-4 w-4 text-slate-500" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLocales.map((supportedLocale) => (
          <SelectItem key={supportedLocale} value={supportedLocale}>
            {localeShortLabels[supportedLocale]} · {localeLabels[supportedLocale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
