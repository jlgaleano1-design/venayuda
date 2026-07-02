import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorUpdateForm } from "@/components/creator-update-form";
import { requireActiveAdminProfile } from "@/lib/admin-auth";
import { formatUsdAprox } from "@/lib/demo-data";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";

type AdminCampaignPageProps = {
  params: Promise<{ campaignId: string }>;
};

type CampaignRow = {
  id: string;
  responsible_person_name: string;
  slug: string;
  title: string;
};

type PublicCampaignRow = {
  available_balance_usd: string | number;
  total_approved_purchases_usd: string | number;
  total_verified_donations_usd: string | number;
};

type PublicPurchaseRow = {
  amount_usd_estimated: string | number | null;
  created_at: string;
  description: string | null;
  id: string;
  purchase_date: string | null;
  title: string;
  vendor: string | null;
};

type DonorCountRow = {
  donor_contact: string | null;
  donor_name: string | null;
  id: string;
  public_code: string;
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignPage({
  params,
}: AdminCampaignPageProps) {
  const { campaignId } = await params;
  const { supabase } = await requireActiveAdminProfile();
  const [
    { data: campaign },
    { data: summary },
    { data: purchases },
    { data: verifiedDonations },
  ] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, responsible_person_name, slug, title")
        .eq("id", campaignId)
        .eq("status", "active")
        .maybeSingle<CampaignRow>(),
      supabase
        .from("public_campaigns")
        .select(
          "available_balance_usd, total_approved_purchases_usd, total_verified_donations_usd",
        )
        .eq("id", campaignId)
        .maybeSingle<PublicCampaignRow>(),
      supabase
        .from("public_purchases")
        .select(
          "amount_usd_estimated, created_at, description, id, purchase_date, title, vendor",
        )
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<PublicPurchaseRow[]>(),
      supabase
        .from("donations")
        .select("donor_contact, donor_name, id, public_code")
        .eq("campaign_id", campaignId)
        .eq("status", "verified")
        .returns<DonorCountRow[]>(),
    ]);

  if (!campaign) {
    notFound();
  }

  const donorCount = countVerifiedDonors(verifiedDonations ?? []);

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="space-y-3">
            <Link
              className="inline-flex w-fit items-center gap-2 text-sm font-bold"
              href="/admin"
            >
              <ArrowLeft size={18} />
              Panel admin
            </Link>
            <span className="soft-pill">Vista privada</span>
            <h1 className="text-3xl font-black tracking-normal md:text-4xl">
              {campaign.title}
            </h1>
            <p className="max-w-3xl leading-7 text-neutral-700">
              Espacio interno para ayudar a {campaign.responsible_person_name} a
              reportar uso de fondos en la campaña y avisar a donantes
              verificados.
            </p>
          </div>
          <Link
            className="btn-secondary w-fit"
            href={getPublicCampaignPath(campaign.slug)}
          >
            Ver página pública
            <ExternalLink size={16} />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <CreatorUpdateForm
              campaign={{
                id: campaign.id,
                slug: campaign.slug,
              }}
              endpoint="/api/admin/campaign-updates"
              statusSuccessMessage="Uso de fondos publicado. Los correos quedaron en cola para donantes verificados."
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Resumen</h2>
                <Metric
                  label="Donantes verificados"
                  value={`${donorCount} ${donorCount === 1 ? "donante" : "donantes"}`}
                />
                <Metric
                  label="Donación verificada"
                  value={formatUsdAprox(
                    Number(summary?.total_verified_donations_usd ?? 0),
                  )}
                />
                <Metric
                  label="Uso de fondos reportado"
                  value={formatUsdAprox(
                    Number(summary?.total_approved_purchases_usd ?? 0),
                  )}
                />
                <Metric
                  label="Saldo disponible"
                  value={formatUsdAprox(
                    Number(summary?.available_balance_usd ?? 0),
                  )}
                />
              </div>
            </section>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">
                  Uso de fondos reportado
                </h2>
                {(purchases ?? []).length > 0 ? (
                  (purchases ?? []).map((purchase) => (
                    <div key={purchase.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold">{purchase.title}</p>
                        {purchase.amount_usd_estimated ? (
                          <p className="whitespace-nowrap text-sm">
                            {formatUsdAprox(Number(purchase.amount_usd_estimated))}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-neutral-600">
                        {formatDate(purchase.purchase_date ?? purchase.created_at)}
                        {purchase.vendor ? ` · ${purchase.vendor}` : ""}
                      </p>
                      {purchase.description ? (
                        <p className="text-sm leading-6 text-neutral-700">
                          {purchase.description}
                        </p>
                      ) : null}
                      <div className="h-px bg-neutral-200" />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] bg-neutral-50 p-4">
                    <p className="font-extrabold">Sin uso de fondos reportado</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Lo que subas desde esta pantalla aparecerá en la campaña.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 pb-3 last:border-b-0 last:pb-0">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function countVerifiedDonors(donations: DonorCountRow[]) {
  const donorKeys = new Set(
    donations.map((donation) => {
      const contact = donation.donor_contact?.trim().toLowerCase();
      const name = donation.donor_name?.trim().toLowerCase();

      return contact || name || donation.public_code || donation.id;
    }),
  );

  return donorKeys.size;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
