"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function DocumentLanguage({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;

    return () => {
      document.documentElement.lang = "es";
    };
  }, [locale]);

  return null;
}
