import {
  ArrowLeft,
  ArchiveX,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileClock,
  Inbox,
  LogOut,
  MousePointerClick,
  Send,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireActiveAdminProfile } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminPageProps = {
  searchParams?: Promise<{
    review?: string;
  }>;
};

type CampaignRow = {
  affected_area: string | null;
  cover_image_path: string | null;
  contact_info: string | null;
  created_at: string;
  description: string;
  id: string;
  instagram_handle: string | null;
  responsible_organization: string | null;
  responsible_person_name: string;
  slug: string;
  status: string;
  title: string;
  verification_status: string;
};

type DonationRow = {
  amount_original: string | number;
  amount_usd_estimated: string | number | null;
  campaign: { slug: string; title: string } | null;
  created_at: string;
  currency_original: string;
  donor_contact: string | null;
  donor_name: string | null;
  id: string;
  proof_file_path: string | null;
  public_code: string;
  public_message: string | null;
  transfer_reference: string | null;
  transfer_date: string | null;
};

type PurchaseRow = {
  amount_original: string | number;
  amount_usd_estimated: string | number | null;
  campaign: { slug: string; title: string } | null;
  created_at: string;
  currency_original: string;
  description: string | null;
  id: string;
  invoice_file_path: string | null;
  photo_file_path: string | null;
  purchase_date: string | null;
  title: string;
  vendor: string | null;
};

type PublicCampaignRow = {
  available_balance_usd: string | number;
  id: string;
  slug: string;
  title: string;
  total_approved_purchases_usd: string | number;
  total_verified_donations_usd: string | number;
  verification_status: "pending" | "unverified" | "verified" | "rejected";
};

type CampaignEngagementRow = {
  campaign_id: string;
  created_at: string;
  event_type: "campaign_view" | "payment_method_copy";
};

type DonationStatusRow = {
  campaign_id: string;
  created_at: string;
  status: "pending" | "verified" | "rejected";
};

type CampaignRequestAuditRow = {
  block_reason: string | null;
  campaign: {
    id: string;
    slug: string;
    status: string;
    title: string;
    verification_status: string;
  } | null;
  campaign_id: string | null;
  contact_email: string | null;
  created_at: string;
  id: string;
  instagram_handle: string | null;
  risk_flags: string[] | null;
  slug: string | null;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { profile, supabase } = await requireActiveAdminProfile();
  const params = await searchParams;
  const storageAdmin = createAdminClient();
  const [
    { data: pendingCampaigns },
    { data: pendingDonations },
    { data: pendingPurchases },
    { data: publicCampaigns },
    { data: engagementEvents },
    { data: donationStatuses },
    { data: suspiciousCampaignAudits },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "affected_area, contact_info, cover_image_path, created_at, description, id, instagram_handle, responsible_organization, responsible_person_name, slug, status, title, verification_status",
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(20)
      .returns<CampaignRow[]>(),
    supabase
      .from("donations")
      .select(
        "amount_original, amount_usd_estimated, campaign:campaigns(slug, title), created_at, currency_original, donor_contact, donor_name, id, proof_file_path, public_code, public_message, transfer_date, transfer_reference",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20)
      .returns<DonationRow[]>(),
    supabase
      .from("purchases")
      .select(
        "amount_original, amount_usd_estimated, campaign:campaigns(slug, title), created_at, currency_original, description, id, invoice_file_path, photo_file_path, purchase_date, title, vendor",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20)
      .returns<PurchaseRow[]>(),
    supabase
      .from("public_campaigns")
      .select(
        "available_balance_usd, id, slug, title, total_approved_purchases_usd, total_verified_donations_usd, verification_status",
      )
      .returns<PublicCampaignRow[]>(),
    supabase
      .from("campaign_engagement_events")
      .select("campaign_id, created_at, event_type")
      .order("created_at", { ascending: false })
      .limit(5000)
      .returns<CampaignEngagementRow[]>(),
    supabase
      .from("donations")
      .select("campaign_id, created_at, status")
      .returns<DonationStatusRow[]>(),
    supabase
      .from("campaign_request_audit_events")
      .select(
        "block_reason, campaign_id, contact_email, created_at, id, instagram_handle, risk_flags, slug, campaign:campaigns(id, slug, status, title, verification_status)",
      )
      .eq("event_type", "suspicious")
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<CampaignRequestAuditRow[]>(),
  ]);

  const campaigns = pendingCampaigns ?? [];
  const donations = pendingDonations ?? [];
  const purchases = pendingPurchases ?? [];
  const campaignActivity = buildCampaignActivity({
    donationStatuses: donationStatuses ?? [],
    engagementEvents: engagementEvents ?? [],
    publicCampaigns: publicCampaigns ?? [],
  });
  const fileUrls = await buildAdminFileUrls({
    campaigns,
    donations,
    purchases,
    storageAdmin,
  });
  const totals = (publicCampaigns ?? []).reduce(
    (summary, campaign) => ({
      activeCampaigns: summary.activeCampaigns + 1,
      approvedPurchases:
        summary.approvedPurchases +
        Number(campaign.total_approved_purchases_usd ?? 0),
      availableBalance:
        summary.availableBalance + Number(campaign.available_balance_usd ?? 0),
      verifiedDonations:
        summary.verifiedDonations +
        Number(campaign.total_verified_donations_usd ?? 0),
    }),
    {
      activeCampaigns: 0,
      approvedPurchases: 0,
      availableBalance: 0,
      verifiedDonations: 0,
    },
  );

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <span className="soft-pill">Admin</span>
            <h1 className="text-3xl font-black tracking-normal">
              Panel de revisión
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-neutral-600">
              Revisa solicitudes, confirma donaciones y publica compras de
              campañas activas en Vendonar.
            </p>
            <p className="text-xs font-bold text-neutral-500">
              {profile.full_name ?? profile.email} · {profile.role}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn-secondary" href="/">
              <ArrowLeft size={18} />
              Ver sitio
            </Link>
            <form action={logout}>
              <button className="btn-primary" type="submit">
                <LogOut size={18} />
                Salir
              </button>
            </form>
          </div>
        </div>

        {params?.review ? <ReviewNotice status={params.review} /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<FileClock size={20} />}
            label="Campañas públicas"
            value={String(totals.activeCampaigns)}
          />
          <SummaryCard
            icon={<CircleDollarSign size={20} />}
            label="Total verificado"
            value={formatUsdAprox(totals.verifiedDonations)}
          />
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Saldo disponible"
            value={formatUsdAprox(totals.availableBalance)}
          />
        </div>

        <section className="surface-card">
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="text-lg font-extrabold">
                Actividad de campañas
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Señales internas de intención: visitas, copias de métodos de
                donación, avisos recibidos y donaciones verificadas.
              </p>
            </div>
            {campaignActivity.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {campaignActivity.map((campaign) => (
                  <ActivityItem campaign={campaign} key={campaign.id} />
                ))}
              </div>
            ) : (
              <EmptyQueue />
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="text-lg font-extrabold">
                Campañas sospechosas
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Solicitudes publicadas con señales obvias de basura para revisar
                y archivar rápido si hace falta.
              </p>
            </div>
            {(suspiciousCampaignAudits ?? []).length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {(suspiciousCampaignAudits ?? []).map((audit) => (
                  <SuspiciousCampaignItem audit={audit} key={audit.id} />
                ))}
              </div>
            ) : (
              <EmptyQueue />
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="text-lg font-extrabold">
                Campañas públicas
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Verifica campañas públicas o archiva las que no deben seguir
                visibles.
              </p>
            </div>
            {(publicCampaigns ?? []).length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {(publicCampaigns ?? []).map((campaign) => (
                  <PublicCampaignModerationItem
                    campaign={campaign}
                    key={campaign.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyQueue />
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <QueueCard title="Solicitudes de campaña">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <QueueItem
                  action={`/admin/review/campaigns/${campaign.id}`}
                  approveLabel="Aprobar"
                  badge={campaign.verification_status}
                  key={campaign.id}
                  meta={[
                    campaign.responsible_person_name,
                    campaign.responsible_organization,
                    campaign.contact_info,
                    campaign.instagram_handle,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  details={[
                    campaign.affected_area,
                    truncate(campaign.description),
                  ].filter(Boolean)}
                  links={
                    fileUrls.campaigns[campaign.id]
                      ? [{ label: "Abrir portada", href: fileUrls.campaigns[campaign.id] }]
                      : []
                  }
                  rejectLabel="Rechazar"
                  title={campaign.title}
                />
              ))
            ) : (
              <EmptyQueue />
            )}
          </QueueCard>

          <QueueCard title="Donaciones por verificar">
            {donations.length > 0 ? (
              donations.map((donation) => (
                <QueueItem
                  action={`/admin/review/donations/${donation.id}`}
                  approveLabel="Verificar"
                  amountUsdEstimated={
                    donation.amount_usd_estimated ??
                    (donation.currency_original === "USD"
                      ? donation.amount_original
                      : null)
                  }
                  badge={donation.currency_original}
                  currencyOriginal={donation.currency_original}
                  key={donation.id}
                  meta={[
                    donation.campaign?.title,
                    donation.public_code,
                    donation.donor_name || donation.donor_contact,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  details={[
                    donation.transfer_date
                      ? `Fecha: ${formatDate(donation.transfer_date)}`
                      : null,
                    donation.transfer_reference
                      ? `Referencia: ${donation.transfer_reference}`
                      : null,
                    donation.amount_usd_estimated
                      ? `Estimado reportado: ${formatUsdAprox(
                          Number(donation.amount_usd_estimated),
                        )}`
                      : "Sin estimado USD reportado",
                    donation.public_message
                      ? `Mensaje: ${truncate(donation.public_message)}`
                      : null,
                  ].filter(Boolean)}
                  links={
                    fileUrls.donations[donation.id]
                      ? [{ label: "Abrir comprobante", href: fileUrls.donations[donation.id] }]
                      : []
                  }
                  rejectLabel="Rechazar"
                  title={formatMoney(
                    donation.amount_original,
                    donation.currency_original,
                  )}
                />
              ))
            ) : (
              <EmptyQueue />
            )}
          </QueueCard>

          <QueueCard title="Compras por aprobar">
            {purchases.length > 0 ? (
              purchases.map((purchase) => (
                <QueueItem
                  action={`/admin/review/purchases/${purchase.id}`}
                  approveLabel="Aprobar"
                  amountUsdEstimated={
                    purchase.amount_usd_estimated ??
                    (purchase.currency_original === "USD"
                      ? purchase.amount_original
                      : null)
                  }
                  badge={purchase.currency_original}
                  currencyOriginal={purchase.currency_original}
                  key={purchase.id}
                  meta={[purchase.campaign?.title, purchase.vendor]
                    .filter(Boolean)
                    .join(" · ")}
                  details={[
                    purchase.purchase_date
                      ? `Fecha: ${formatDate(purchase.purchase_date)}`
                      : null,
                    purchase.description
                      ? truncate(purchase.description)
                      : null,
                    purchase.amount_usd_estimated
                      ? `Estimado reportado: ${formatUsdAprox(
                          Number(purchase.amount_usd_estimated),
                        )}`
                      : "Sin estimado USD reportado",
                  ].filter(Boolean)}
                  links={[
                    fileUrls.purchasePhotos[purchase.id]
                      ? {
                          label: "Abrir foto",
                          href: fileUrls.purchasePhotos[purchase.id],
                        }
                      : null,
                    fileUrls.purchaseInvoices[purchase.id]
                      ? {
                          label: "Abrir factura/ticket",
                          href: fileUrls.purchaseInvoices[purchase.id],
                        }
                      : null,
                  ].filter(isFileLink)}
                  rejectLabel="Rechazar"
                  title={`${purchase.title} · ${formatMoney(
                    purchase.amount_original,
                    purchase.currency_original,
                  )}`}
                />
              ))
            ) : (
              <EmptyQueue />
            )}
          </QueueCard>
        </div>
      </section>
    </main>
  );
}

type CampaignActivity = {
  id: string;
  intentionRate7d: number;
  slug: string;
  title: string;
  totalCopies: number;
  totalReports: number;
  totalVerified: number;
  totalViews: number;
  views7d: number;
  copies7d: number;
  reports7d: number;
  verified7d: number;
};

function buildCampaignActivity({
  donationStatuses,
  engagementEvents,
  publicCampaigns,
}: {
  donationStatuses: DonationStatusRow[];
  engagementEvents: CampaignEngagementRow[];
  publicCampaigns: PublicCampaignRow[];
}) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return publicCampaigns
    .map((campaign): CampaignActivity => {
      const campaignEvents = engagementEvents.filter(
        (event) => event.campaign_id === campaign.id,
      );
      const recentEvents = campaignEvents.filter(
        (event) => new Date(event.created_at).getTime() >= sevenDaysAgo,
      );
      const campaignDonations = donationStatuses.filter(
        (donation) => donation.campaign_id === campaign.id,
      );
      const recentDonations = campaignDonations.filter(
        (donation) => new Date(donation.created_at).getTime() >= sevenDaysAgo,
      );

      const totalViews = countEvents(campaignEvents, "campaign_view");
      const copies7d = countEvents(recentEvents, "payment_method_copy");
      const views7d = countEvents(recentEvents, "campaign_view");
      const reports7d = recentDonations.length;
      const verified7d = recentDonations.filter(
        (donation) => donation.status === "verified",
      ).length;

      return {
        copies7d,
        id: campaign.id,
        intentionRate7d: views7d > 0 ? copies7d / views7d : 0,
        reports7d,
        slug: campaign.slug,
        title: campaign.title,
        totalCopies: countEvents(campaignEvents, "payment_method_copy"),
        totalReports: campaignDonations.length,
        totalVerified: campaignDonations.filter(
          (donation) => donation.status === "verified",
        ).length,
        totalViews,
        verified7d,
        views7d,
      };
    })
    .filter(
      (campaign) =>
        campaign.totalViews > 0 ||
        campaign.totalCopies > 0 ||
        campaign.totalReports > 0 ||
        campaign.totalVerified > 0,
    )
    .sort(
      (a, b) =>
        b.copies7d - a.copies7d ||
        b.views7d - a.views7d ||
        b.totalReports - a.totalReports,
    )
    .slice(0, 8);
}

function countEvents(
  events: CampaignEngagementRow[],
  eventType: CampaignEngagementRow["event_type"],
) {
  return events.filter((event) => event.event_type === eventType).length;
}

function ActivityItem({ campaign }: { campaign: CampaignActivity }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{campaign.title}</p>
          <Link
            className="mt-1 inline-flex text-sm font-bold text-[#2D5D5E]"
            href={`/campanas/${campaign.slug}`}
          >
            /campanas/{campaign.slug}
          </Link>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700">
          7 días
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <ActivityMetric
          icon={<Eye size={16} />}
          label="Visitas"
          value={campaign.views7d}
        />
        <ActivityMetric
          icon={<MousePointerClick size={16} />}
          label="Copias"
          value={campaign.copies7d}
        />
        <ActivityMetric
          icon={<Send size={16} />}
          label="Avisos"
          value={campaign.reports7d}
        />
        <ActivityMetric
          icon={<CheckCircle2 size={16} />}
          label="Verificadas"
          value={campaign.verified7d}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-neutral-600">
        <span className="rounded-full bg-white px-3 py-1">
          Intención: {formatPercent(campaign.intentionRate7d)}
        </span>
        <span className="rounded-full bg-white px-3 py-1">
          Total visitas: {formatCount(campaign.totalViews)}
        </span>
        <span className="rounded-full bg-white px-3 py-1">
          Total copias: {formatCount(campaign.totalCopies)}
        </span>
      </div>
    </div>
  );
}

function ActivityMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="flex items-center gap-2 text-neutral-500">
        {icon}
        <p className="text-xs font-bold">{label}</p>
      </div>
      <p className="mt-2 text-xl font-extrabold">{formatCount(value)}</p>
    </div>
  );
}

function SuspiciousCampaignItem({ audit }: { audit: CampaignRequestAuditRow }) {
  const campaign = audit.campaign;
  const title = campaign?.title ?? audit.slug ?? "Campaña sin título";
  const slug = campaign?.slug ?? audit.slug;
  const canArchive = campaign?.id && campaign.status !== "archived";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {[audit.contact_email, audit.instagram_handle ? `@${audit.instagram_handle}` : null]
              .filter(Boolean)
              .join(" · ") || "Sin contacto registrado"}
          </p>
          {slug ? (
            <Link
              className="mt-1 inline-flex text-sm font-bold text-[#2D5D5E]"
              href={`/campanas/${slug}`}
            >
              /campanas/{slug}
            </Link>
          ) : null}
        </div>
        {canArchive ? (
          <form action={`/admin/review/campaigns/${campaign.id}`} method="post">
            <input name="decision" type="hidden" value="reject" />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full border border-red-200 bg-white px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-50"
              type="submit"
            >
              <ArchiveX size={16} />
              Archivar
            </button>
          </form>
        ) : (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700">
            Archivada
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-neutral-700">
        {(audit.risk_flags ?? []).map((flag) => (
          <span className="rounded-full bg-white px-3 py-1" key={flag}>
            {formatRiskFlag(flag)}
          </span>
        ))}
        <span className="rounded-full bg-white px-3 py-1">
          {formatDate(audit.created_at)}
        </span>
      </div>
    </div>
  );
}

function PublicCampaignModerationItem({
  campaign,
}: {
  campaign: PublicCampaignRow;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{campaign.title}</p>
          <Link
            className="mt-1 inline-flex text-sm font-bold text-[#2D5D5E]"
            href={`/campanas/${campaign.slug}`}
          >
            /campanas/{campaign.slug}
          </Link>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {campaign.verification_status === "verified" ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-extrabold text-emerald-800">
              <CheckCircle2 size={16} />
              Verificada
            </span>
          ) : (
            <form action={`/admin/review/campaigns/${campaign.id}`} method="post">
              <input name="decision" type="hidden" value="approve" />
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full border border-[#2D5D5E]/20 bg-white px-4 text-sm font-extrabold text-[#2D5D5E] transition hover:bg-[#2D5D5E]/5"
                type="submit"
              >
                <CheckCircle2 size={16} />
                Verificar
              </button>
            </form>
          )}
          <form action={`/admin/review/campaigns/${campaign.id}`} method="post">
            <input name="decision" type="hidden" value="reject" />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full border border-red-200 bg-white px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-50"
              type="submit"
            >
              <ArchiveX size={16} />
              Archivar
            </button>
          </form>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-neutral-600">
        <span className="rounded-full bg-white px-3 py-1">
          Estado: {formatVerificationStatus(campaign.verification_status)}
        </span>
        <span className="rounded-full bg-white px-3 py-1">
          Donado: {formatUsdAprox(Number(campaign.total_verified_donations_usd ?? 0))}
        </span>
        <span className="rounded-full bg-white px-3 py-1">
          Usado: {formatUsdAprox(Number(campaign.total_approved_purchases_usd ?? 0))}
        </span>
      </div>
    </div>
  );
}

async function logout() {
  "use server";

  const { supabase } = await requireActiveAdminProfile();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="surface-card">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
          {icon}
        </div>
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="text-2xl font-extrabold">{value}</p>
      </div>
    </section>
  );
}

function QueueCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="surface-card">
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

function QueueItem({
  action,
  amountUsdEstimated,
  approveLabel,
  badge,
  currencyOriginal,
  details = [],
  links = [],
  meta,
  rejectLabel,
  title,
}: {
  action: string;
  amountUsdEstimated?: string | number | null;
  approveLabel: string;
  badge: string;
  currencyOriginal?: string;
  details?: (string | null | undefined)[];
  links?: FileLink[];
  meta: string;
  rejectLabel: string;
  title: string;
}) {
  return (
    <div className="border-b border-neutral-200 pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {meta || "Sin detalle adicional"}
          </p>
          {details.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs leading-5 text-neutral-500">
              {details.map((detail) =>
                detail ? <p key={detail}>{detail}</p> : null,
              )}
            </div>
          ) : null}
          {links.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold text-[#2D5D5E]"
                  href={link.href}
                  key={link.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
          {badge}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form action={action} className="flex flex-col gap-3" method="post">
          <input name="decision" type="hidden" value="approve" />
          {currencyOriginal ? (
            <div className="grid gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs md:grid-cols-2">
              <label className="field-label text-xs">
                USD
                <input
                  className="field h-9 text-sm"
                  defaultValue={formatInputNumber(amountUsdEstimated)}
                  min="0"
                  name="amountUsdEstimated"
                  required
                  step="any"
                  type="number"
                />
              </label>
              <label className="field-label text-xs">
                Tasa usada
                <input
                  className="field h-9 text-sm"
                  min="0"
                  name="exchangeRateUsed"
                  step="any"
                  type="number"
                />
              </label>
              <label className="field-label text-xs">
                Fecha de tasa
                <input
                  className="field h-9 text-sm"
                  name="exchangeRateDate"
                  type="date"
                />
              </label>
              <label className="field-label text-xs">
                Fuente de tasa
                <input
                  className="field h-9 text-sm"
                  name="exchangeRateSource"
                  placeholder="Ej. referencia bancaria"
                />
              </label>
              <label className="field-label text-xs md:col-span-2">
                Notas de conversión
                <textarea
                  className="textarea-field min-h-20 text-sm"
                  name="conversionNotes"
                  placeholder="Contexto o ajuste manual para la conversión"
                />
              </label>
            </div>
          ) : null}
          <button className="btn-primary h-9 px-4" type="submit">
            {approveLabel}
          </button>
        </form>
        <form action={action} method="post">
          <input name="decision" type="hidden" value="reject" />
          <button className="btn-secondary h-9 px-4" type="submit">
            {rejectLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

type FileLink = {
  href: string;
  label: string;
};

function isFileLink(link: FileLink | null): link is FileLink {
  return Boolean(link);
}

function EmptyQueue() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFFCF8] text-neutral-500">
          <Inbox size={18} />
        </span>
        <div>
          <p className="font-bold">Nada pendiente</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Esta cola se llenará cuando existan solicitudes reales para revisar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewNotice({ status }: { status: string }) {
  const message =
    {
      "campaign-approved": "Campaña aprobada o verificada.",
      "campaign-rejected": "Campaña rechazada.",
      currency: "Agrega el equivalente aproximado en USD antes de aprobar.",
      "donation-approved": "Donación verificada.",
      "donation-rejected": "Donación rechazada.",
      error: "No se pudo completar la acción. Revisa Supabase e inténtalo de nuevo.",
      invalid: "La acción enviada no es válida.",
      missing: "No encontramos el registro solicitado.",
      "purchase-approved": "Compra aprobada.",
      "purchase-rejected": "Compra rechazada.",
    }[status] ?? "Acción registrada.";

  return (
    <div className="rounded-2xl border border-[#2D5D5E]/20 bg-[#2D5D5E]/5 px-4 py-3 text-sm font-bold text-[#2D5D5E]">
      {message}
    </div>
  );
}

function formatVerificationStatus(status: PublicCampaignRow["verification_status"]) {
  return (
    {
      pending: "pendiente",
      rejected: "rechazada",
      unverified: "sin verificar",
      verified: "verificada",
    }[status] ?? status
  );
}

function formatRiskFlag(flag: string) {
  return flag
    .replace(/_/g, " ")
    .replace("looks like gibberish", "parece basura")
    .replace("low information", "poca información")
    .replace("fast submission", "envío rápido");
}

function formatMoney(amount: string | number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();

  try {
    return new Intl.NumberFormat("es-MX", {
      currency: normalizedCurrency,
      style: "currency",
    }).format(Number(amount));
  } catch {
    return `${new Intl.NumberFormat("es-MX", {
      maximumFractionDigits: 2,
    }).format(Number(amount))} ${normalizedCurrency}`;
  }
}

function formatUsdAprox(amount: number) {
  return `${new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(Number(amount))} USD`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatInputNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function truncate(value: string, maxLength = 180) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

async function buildAdminFileUrls({
  campaigns,
  donations,
  purchases,
  storageAdmin,
}: {
  campaigns: CampaignRow[];
  donations: DonationRow[];
  purchases: PurchaseRow[];
  storageAdmin: ReturnType<typeof createAdminClient>;
}) {
  const [campaignsMap, donationsMap, purchasePhotosMap, purchaseInvoicesMap] =
    await Promise.all([
      signedUrlMap(
        storageAdmin,
        "campaign-assets",
        campaigns.map((campaign) => [campaign.id, campaign.cover_image_path]),
      ),
      signedUrlMap(
        storageAdmin,
        "donation-proofs",
        donations.map((donation) => [donation.id, donation.proof_file_path]),
      ),
      signedUrlMap(
        storageAdmin,
        "purchase-documents",
        purchases.map((purchase) => [purchase.id, purchase.photo_file_path]),
      ),
      signedUrlMap(
        storageAdmin,
        "purchase-documents",
        purchases.map((purchase) => [purchase.id, purchase.invoice_file_path]),
      ),
    ]);

  return {
    campaigns: campaignsMap,
    donations: donationsMap,
    purchaseInvoices: purchaseInvoicesMap,
    purchasePhotos: purchasePhotosMap,
  };
}

async function signedUrlMap(
  storageAdmin: ReturnType<typeof createAdminClient>,
  bucket: "campaign-assets" | "donation-proofs" | "purchase-documents",
  entries: [string, string | null][],
) {
  const urls: Record<string, string> = {};

  await Promise.all(
    entries.map(async ([id, path]) => {
      if (!path) {
        return;
      }

      const { data } = await storageAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);

      if (data?.signedUrl) {
        urls[id] = data.signedUrl;
      }
    }),
  );

  return urls;
}
