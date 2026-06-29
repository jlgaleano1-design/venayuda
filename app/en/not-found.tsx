import { Home, Search } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { getDictionary } from "@/lib/i18n";
import { getCampaignsAnchorPath, getHomePath } from "@/lib/public-campaign-url";

const t = getDictionary("en");

export default function EnglishNotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#FFFCF8] px-6 py-10 text-[#2A3534]">
      <LanguageSwitcher
        currentLocale="en"
        paths={{
          es: getHomePath("es"),
          en: getHomePath("en"),
        }}
      />
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          actions={[
            {
              href: getCampaignsAnchorPath("en"),
              icon: <Search size={18} />,
              label: t.errors.campaigns,
            },
            {
              href: getHomePath("en"),
              icon: <Home size={18} />,
              label: t.errors.home,
              tone: "secondary",
            },
          ]}
          code="404"
          codeLabel={t.errors.code}
          eyebrow={t.errors.notFoundEyebrow}
          message={t.errors.notFoundMessage}
          title={t.errors.notFoundTitle}
          variant="not-found"
        />
      </div>
      <SiteFooter locale="en" />
    </main>
  );
}
