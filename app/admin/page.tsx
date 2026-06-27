import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  Inbox,
  LogOut,
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
  amount: string | number;
  campaign: { slug: string; title: string } | null;
  created_at: string;
  currency: string;
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
  amount: string | number;
  campaign: { slug: string; title: string } | null;
  created_at: string;
  currency: string;
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
  total_approved_purchases_usd: string | number;
  total_verified_donations_usd: string | number;
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
        "amount, campaign:campaigns(slug, title), created_at, currency, donor_contact, donor_name, id, proof_file_path, public_code, public_message, transfer_date, transfer_reference",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20)
      .returns<DonationRow[]>(),
    supabase
      .from("purchases")
      .select(
        "amount, campaign:campaigns(slug, title), created_at, currency, description, id, invoice_file_path, photo_file_path, purchase_date, title, vendor",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20)
      .returns<PurchaseRow[]>(),
    supabase
      .from("public_campaigns")
      .select(
        "available_balance_usd, id, total_approved_purchases_usd, total_verified_donations_usd",
      )
      .returns<PublicCampaignRow[]>(),
  ]);

  const campaigns = pendingCampaigns ?? [];
  const donations = pendingDonations ?? [];
  const purchases = pendingPurchases ?? [];
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
    <main className="min-h-screen bg-[#FFFCF8] text-[#121515]">
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
            value={formatUsd(totals.verifiedDonations)}
          />
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Saldo disponible"
            value={formatUsd(totals.availableBalance)}
          />
        </div>

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
                  badge={donation.currency}
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
                  title={formatMoney(donation.amount, donation.currency)}
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
                  badge={purchase.currency}
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
                    purchase.amount,
                    purchase.currency,
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
  approveLabel,
  badge,
  details = [],
  links = [],
  meta,
  rejectLabel,
  title,
}: {
  action: string;
  approveLabel: string;
  badge: string;
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
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action} method="post">
          <input name="decision" type="hidden" value="approve" />
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
      "campaign-approved": "Campaña aprobada y publicada.",
      "campaign-rejected": "Campaña rechazada.",
      currency: "Este registro necesita conversión manual a USD antes de aprobarse.",
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

function formatMoney(amount: string | number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    currency,
    style: "currency",
  }).format(Number(amount));
}

function formatUsd(amount: number) {
  return formatMoney(amount, "USD");
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
