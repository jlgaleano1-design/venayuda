import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Instagram } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPaymentValueButton } from "@/components/copy-payment-value-button";
import { DonationReportModal } from "@/components/donation-report-modal";
import { ExpandableDescription } from "@/components/expandable-description";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaign } from "@/lib/campaign-data";
import {
  getCampaignText,
  getDictionary,
  getReceivingCategoryLabel,
  type Locale,
} from "@/lib/i18n";
import {
  getCampaignsAnchorPath,
  getPublicCampaignThumbnailUrl,
  getPublicCampaignUrl,
  getPublicCampaignPath,
} from "@/lib/public-campaign-url";

export async function generateCampaignMetadata({
  locale,
  params,
}: {
  locale: Locale;
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);
  const t = getDictionary(locale);

  if (!campaign) {
    return {
      title: t.campaignDetail.notFoundTitle,
    };
  }

  const campaignText = getCampaignText({
    description: campaign.description,
    descriptionEn: campaign.descriptionEn,
    locale,
    slug: campaign.slug,
    title: campaign.title,
    titleEn: campaign.titleEn,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org";
  const campaignUrl = getPublicCampaignUrl({
    locale,
    siteUrl,
    slug: campaign.slug,
  });
  const thumbnailUrl = getPublicCampaignThumbnailUrl({
    siteUrl,
    slug: campaign.slug,
  });

  return {
    title: campaignText.title,
    description: campaignText.description,
    openGraph: {
      title: campaignText.title,
      description: campaignText.description,
      url: campaignUrl,
      locale: t.metadata.ogLocale,
      images: [
        {
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: campaignText.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: campaignText.title,
      description: campaignText.description,
      images: [thumbnailUrl],
    },
  };
}

export async function PublicCampaignDetailPage({
  locale,
  params,
}: {
  locale: Locale;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);
  const t = getDictionary(locale);

  if (!campaign) {
    notFound();
  }

  const organization = campaign.organization?.trim();
  const campaignText = getCampaignText({
    description: campaign.description,
    descriptionEn: campaign.descriptionEn,
    locale,
    slug: campaign.slug,
    title: campaign.title,
    titleEn: campaign.titleEn,
  });

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <LanguageSwitcher
        currentLocale={locale}
        paths={{
          es: getPublicCampaignPath(campaign.slug, "es"),
          en: getPublicCampaignPath(campaign.slug, "en"),
        }}
      />
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm"
          href={getCampaignsAnchorPath(locale)}
        >
          <ArrowLeft size={18} />
          {t.campaignDetail.backToCampaigns}
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="status-pill bg-emerald-50 text-emerald-800">
              {t.campaignDetail.status[campaign.status]}
            </span>
            <span className="tag-pill min-h-7 bg-neutral-100 text-neutral-700">
              {campaign.location}
            </span>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-normal md:text-4xl">
            {campaignText.title}
          </h1>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="space-y-4">
              {campaign.coverImageUrl ? (
                <div
                  aria-label={t.campaignDetail.coverAlt(campaignText.title)}
                  className="aspect-[16/9] w-full rounded-[2rem] bg-neutral-100 bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${campaign.coverImageUrl})` }}
                />
              ) : null}
              <ExpandableDescription className="text-sm leading-6 text-neutral-700 md:text-base md:leading-7">
                {campaignText.description}
              </ExpandableDescription>
            </div>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">
                  {t.campaignDetail.whoResponds}
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Info
                    label={t.campaignDetail.responsible}
                    value={campaign.responsible}
                  />
                  {organization ? (
                    <Info
                      label={t.campaignDetail.organization}
                      value={organization}
                    />
                  ) : null}
                </div>
                {campaign.instagramHandle ? (
                  <a
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-extrabold text-[#2D5D5E]"
                    href={`https://instagram.com/${campaign.instagramHandle}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Instagram size={16} />
                    @{campaign.instagramHandle}
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2">
            <div className="flex flex-col gap-4">
              <div>
                <PaymentMethodsCard campaign={campaign} locale={locale} />
              </div>
            </div>
          </aside>

          <div className="grid gap-4 lg:col-start-1 lg:row-start-2 lg:grid-cols-2">
            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">
                  {t.campaignDetail.verifiedDonations}
                </h2>
                {campaign.donations.length === 0 ? (
                  <EmptyState>{t.campaignDetail.emptyDonations}</EmptyState>
                ) : null}
                {campaign.donations.map((donation) => (
                  <div key={donation.code} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{donation.amount}</p>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                        {donation.code}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {donation.donor} · {donation.date}
                    </p>
                    {donation.message ? (
                      <p className="text-sm">{donation.message}</p>
                    ) : null}
                    <div className="h-px bg-neutral-200" />
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">
                  {t.campaignDetail.confirmedUseOfFunds}
                </h2>
                {campaign.purchases.length === 0 ? (
                  <EmptyState>{t.campaignDetail.emptyPurchases}</EmptyState>
                ) : null}
                {campaign.purchases.map((purchase) => (
                  <div key={purchase.title} className="space-y-3">
                    {purchase.photoUrl ? (
                      <div
                        aria-label={t.campaignDetail.coverAlt(purchase.title)}
                        className="h-40 w-full rounded-[1.5rem] bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${purchase.photoUrl})` }}
                      />
                    ) : null}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{purchase.title}</p>
                        <p className="text-sm">{purchase.amount}</p>
                      </div>
                      {purchase.description ? (
                        <ExpandableDescription
                          className="text-sm leading-6 text-neutral-700"
                          fadeColor="#FEFEFE"
                        >
                          {purchase.description}
                        </ExpandableDescription>
                      ) : null}
                      <p className="text-sm text-neutral-600">
                        {purchase.date} ·{" "}
                        {purchase.invoicePublic
                          ? t.campaignDetail.publicInvoice
                          : t.campaignDetail.privateInvoice}
                      </p>
                    </div>
                    <div className="h-px bg-neutral-200" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-neutral-200 pt-3 text-sm leading-6 text-neutral-500">
      {children}
    </p>
  );
}

function PaymentMethodsCard({
  campaign,
  locale = "es",
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof getPublicCampaign>>>;
  locale?: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <section
      id="metodos-donacion"
      className="surface-card scroll-mt-6 overflow-hidden border-[#2D5D5E]/20 shadow-sm"
    >
      <div className="flex flex-col gap-5 p-5 lg:p-6">
        <h2 className="text-lg font-extrabold">
          {t.campaignDetail.donationMethods}
        </h2>
        <div className="divide-y divide-neutral-200 pr-1">
          {campaign.paymentMethods.map((method) => {
            const details = parsePaymentDetails({
              instructions: method.instructions,
              notes: method.notes,
            });

            return (
              <div key={method.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-base font-extrabold leading-6">
                  <span>
                    {getReceivingCategoryLabel(method.receivingCategory, locale)}
                    :
                  </span>{" "}
                  <span>{method.label}</span>
                </p>
                <div className="mt-4 grid gap-3">
                  <PaymentField
                    label={t.campaignDetail.accountHolder}
                    value={method.accountHolder}
                  />
                  <PaymentField
                    copyValue={details.accountReference}
                    label={t.campaignDetail.accountReference}
                    value={details.accountReference}
                  />
                  <PaymentField
                    label={t.campaignDetail.currency}
                    value={method.currency}
                  />
                  <PaymentField
                    multiline
                    label={t.campaignDetail.instructions}
                    value={details.instructions}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <DonationReportModal campaign={campaign} locale={locale} />
      </div>
    </section>
  );
}

function PaymentField({
  copyValue,
  label,
  multiline = false,
  value,
}: {
  copyValue?: string;
  label: string;
  multiline?: boolean;
  value: string;
}) {
  if (!value.trim()) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-normal text-neutral-500">
        {label}
      </p>
      <div className="mt-1 flex items-start gap-2">
        <p
          className={
            multiline
              ? "min-w-0 flex-1 whitespace-pre-line text-sm leading-6 text-neutral-700"
              : "min-w-0 flex-1 break-words text-sm font-bold leading-6 text-[#2A3534]"
          }
        >
          {value}
        </p>
        {copyValue ? <CopyPaymentValueButton value={copyValue} /> : null}
      </div>
    </div>
  );
}

function parsePaymentDetails({
  instructions,
  notes,
}: {
  instructions: string;
  notes?: string;
}) {
  const detailLines = splitPaymentLines([notes, instructions]);
  const visibleInstructionLines = splitPaymentLines([instructions]).filter(
    (line) =>
      !isBankLine(line) &&
      !isAccountReferenceLine(line) &&
      !isCryptoMarkerLine(line),
  );

  return {
    accountReference: getPaymentLineValue(detailLines, isAccountReferenceLine),
    instructions: visibleInstructionLines.join("\n"),
    platform: getPaymentLineValue(detailLines, isBankLine),
  };
}

function splitPaymentLines(values: Array<string | undefined>) {
  return values
    .flatMap((value) => value?.split("\n") ?? [])
    .map((line) => line.trim())
    .filter(Boolean);
}

function getPaymentLineValue(
  lines: string[],
  matcher: (line: string) => boolean,
) {
  const line = lines.find(matcher);

  return line?.replace(/^[^:]+:\s*/, "").trim() ?? "";
}

function isBankLine(line: string) {
  return /^Banco, plataforma o método:/i.test(line);
}

function isAccountReferenceLine(line: string) {
  return /^Cuenta, correo, wallet o ID:/i.test(line);
}

function isCryptoMarkerLine(line: string) {
  return /^Categoría de recepción: Cripto$/i.test(line);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
