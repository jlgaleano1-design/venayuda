import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Instagram } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPaymentValueButton } from "@/components/copy-payment-value-button";
import { DonationReportModal } from "@/components/donation-report-modal";
import { ExpandableDescription } from "@/components/expandable-description";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaign } from "@/lib/campaign-data";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";

const categoryLabels: Record<string, string> = {
  crypto: "Cripto",
  mexico: "México",
  united_states: "Estados Unidos",
  venezuela: "Venezuela",
  spain: "España",
  panama: "Panamá",
  colombia: "Colombia",
  chile: "Chile",
  argentina: "Argentina",
  international: "Otros países",
};

const compactUsdFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

export const dynamic = "force-static";
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);

  if (!campaign) {
    return {
      title: "Campaña no encontrada",
    };
  }

  return {
    title: campaign.title,
    description: campaign.description,
    openGraph: {
      title: campaign.title,
      description: campaign.description,
      url: getPublicCampaignPath(campaign.slug),
      images: [
        {
          url: "/vendonar-og-campanas.png",
          width: 1672,
          height: 941,
          alt: campaign.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.title,
      description: campaign.description,
      images: ["/vendonar-og-campanas.png"],
    },
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);

  if (!campaign) {
    notFound();
  }

  const organization = campaign.organization?.trim();

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm"
          href="/#campanas"
        >
          <ArrowLeft size={18} />
          Campañas
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="status-pill bg-emerald-50 text-emerald-800">
              {campaign.status === "active" ? "Activa" : "Pausada"}
            </span>
            <span className="tag-pill min-h-7 bg-neutral-100 text-neutral-700">
              {campaign.location}
            </span>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-normal md:text-4xl">
            {campaign.title}
          </h1>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="space-y-4">
              {campaign.coverImageUrl ? (
                <div
                  aria-label={`Foto de ${campaign.title}`}
                  className="aspect-[16/9] w-full rounded-[2rem] bg-neutral-100 bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${campaign.coverImageUrl})` }}
                />
              ) : null}
              <ExpandableDescription className="text-sm leading-6 text-neutral-700 md:text-base md:leading-7">
                {campaign.description}
              </ExpandableDescription>
            </div>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Quién responde</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Info label="Responsable" value={campaign.responsible} />
                  {organization ? (
                    <Info label="Organización" value={organization} />
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
              <div className="order-2 lg:order-1">
                <TransparencyCard
                  campaign={campaign}
                />
              </div>
              <div className="order-1 lg:order-2">
                <PaymentMethodsCard campaign={campaign} />
              </div>
              <div className="order-3">
                <TransparencyLegend />
              </div>
            </div>
          </aside>

          <div className="grid gap-4 lg:col-start-1 lg:row-start-2 lg:grid-cols-2">
            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">
                  Donaciones verificadas
                </h2>
                {campaign.donations.length === 0 ? (
                  <EmptyState>
                    Los aportes reportados aparecerán acá después de ser
                    revisados.
                  </EmptyState>
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
                  Uso de fondos confirmado
                </h2>
                {campaign.purchases.length === 0 ? (
                  <EmptyState>
                    Los gastos y avances se publicarán acá cuando haya
                    comprobantes revisados.
                  </EmptyState>
                ) : null}
                {campaign.purchases.map((purchase) => (
                  <div key={purchase.title} className="space-y-3">
                    {purchase.photoUrl ? (
                      <div
                        aria-label={`Foto de ${purchase.title}`}
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
                          ? "Comprobante publico"
                          : "Comprobante privado"}
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
      <SiteFooter />
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
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof getPublicCampaign>>>;
}) {
  return (
    <section
      id="metodos-donacion"
      className="surface-card scroll-mt-6 overflow-hidden border-[#2D5D5E]/20 shadow-sm"
    >
      <div className="flex flex-col gap-5 p-5 lg:p-6">
        <h2 className="text-lg font-extrabold">
          Métodos para recibir donaciones
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
                  <span>{categoryLabels[method.receivingCategory]}:</span>{" "}
                  <span>{method.label}</span>
                </p>
                <div className="mt-4 grid gap-3">
                  <PaymentField label="Titular" value={method.accountHolder} />
                  <PaymentField
                    copyValue={details.accountReference}
                    label="Cuenta, correo, wallet o ID"
                    value={details.accountReference}
                  />
                  <PaymentField label="Moneda" value={method.currency} />
                  <PaymentField
                    multiline
                    label="Otros datos o instrucciones"
                    value={details.instructions}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <DonationReportModal campaign={campaign} />
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

function TransparencyCard({
  campaign,
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof getPublicCampaign>>>;
}) {
  const hasNoDonations = campaign.totals.donated <= 0;

  return (
    <section className="surface-card">
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-extrabold">Transparencia</h2>
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Recaudados"
            value={formatCompactUsd(campaign.totals.donated)}
          />
          <Metric
            label="Utilizados"
            value={formatCompactUsd(campaign.totals.spent)}
          />
          <Metric
            label="Disponibles"
            value={formatCompactUsd(campaign.totals.balance)}
          />
        </div>
        {hasNoDonations ? (
          <a
            className="w-fit text-xs font-extrabold text-[#2D5D5E] underline-offset-4 hover:underline"
            href="#metodos-donacion"
          >
            Sé el primero en ayudar
          </a>
        ) : null}
      </div>
    </section>
  );
}

function TransparencyLegend() {
  return (
    <p className="px-1 text-xs leading-5 text-neutral-600">
      Las donaciones se hacen directamente por los métodos publicados.
      Repórtanos tu aporte para revisarlo manualmente y actualizar el
      seguimiento público en USD referencial.
    </p>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-neutral-200 pr-3 last:border-r-0">
      <p className="truncate text-xs text-neutral-500 sm:text-sm">{label}</p>
      <p className="break-words text-base font-extrabold leading-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function formatCompactUsd(value: number) {
  return `${compactUsdFormatter.format(value)} USD`;
}
