import Link from "next/link";
import type { Route } from "next";
import { getDictionary, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  currentLocale,
  paths,
}: {
  currentLocale: Locale;
  paths: Record<Locale, Route>;
}) {
  const t = getDictionary(currentLocale).language;

  return (
    <nav
      aria-label={t.label}
      className="absolute right-4 top-4 z-40 rounded-full border border-neutral-200 bg-[#FFFCF8]/95 p-1 text-xs font-black shadow-sm backdrop-blur"
    >
      <div className="flex items-center gap-1">
        <Link
          aria-current={currentLocale === "es" ? "page" : undefined}
          className={
            currentLocale === "es"
              ? "rounded-full bg-[#2D5D5E] px-3 py-2 text-[#FAE880]"
              : "rounded-full px-3 py-2 text-[#2A3534] hover:bg-neutral-100"
          }
          href={paths.es}
        >
          {t.spanish}
        </Link>
        <Link
          aria-current={currentLocale === "en" ? "page" : undefined}
          className={
            currentLocale === "en"
              ? "rounded-full bg-[#2D5D5E] px-3 py-2 text-[#FAE880]"
              : "rounded-full px-3 py-2 text-[#2A3534] hover:bg-neutral-100"
          }
          href={paths.en}
        >
          {t.english}
        </Link>
      </div>
    </nav>
  );
}
