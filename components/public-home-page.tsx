import { HandHeart, PackageCheck, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CampaignList } from "@/components/campaign-list";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaigns } from "@/lib/campaign-data";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getCampaignsAnchorPath, getHomePath } from "@/lib/public-campaign-url";

export async function PublicHomePage({ locale }: { locale: Locale }) {
  const campaigns = await getPublicCampaigns();
  const t = getDictionary(locale);

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <LanguageSwitcher
        currentLocale={locale}
        paths={{
          es: getHomePath("es"),
          en: getHomePath("en"),
        }}
      />
      <section className="mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-4xl space-y-6">
          <Image
            alt="Vendonar"
            className="h-12 w-auto"
            height={48}
            src="/vendonar_logo.svg"
            width={188}
          />
          <h1 className="text-4xl font-black leading-[1.28] tracking-normal md:text-6xl">
            {t.home.heroLine1}
            <br />
            {t.home.heroLine2}
          </h1>
          <p className="max-w-3xl text-lg leading-[1.84] text-neutral-700 md:text-xl md:leading-[1.66]">
            {t.home.heroBody}
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <a className="btn-primary" href={getCampaignsAnchorPath(locale)}>
              {t.home.donateNow} <span aria-hidden="true">&darr;</span>
            </a>
            <Link className="btn-secondary" href="/campanas/crear">
              <Plus size={18} />
              {t.home.createCampaign}
            </Link>
            <a
              className="btn-tertiary"
              href="https://centrosayudavenezuela.org/"
              rel="noreferrer"
              target="_blank"
            >
              <PackageCheck size={18} />
              {t.home.collectionCenters}
            </a>
            <a
              className="btn-tertiary"
              href="https://donaxvenezuela.org/"
              rel="noreferrer"
              target="_blank"
            >
              <HandHeart size={18} />
              {t.home.foundations}
            </a>
          </div>
        </div>
      </section>

      <section
        id="campanas"
        className="mx-auto flex max-w-6xl scroll-mt-8 flex-col gap-5 overflow-visible px-6 pb-16"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-extrabold tracking-normal">
                {t.home.publishedCampaigns}
              </h2>
            </div>
          </div>
        </div>
        <CampaignList campaigns={campaigns} locale={locale} />
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
