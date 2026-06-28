import {
  campaigns,
  formatOriginalAndUsd,
  type Campaign,
  type ReceivingCategory,
} from "@/lib/demo-data";
import { createPublicClient } from "@/lib/supabase/public";
import type { SupabaseClient } from "@supabase/supabase-js";

const cryptoCategoryMarker = "Categoría de recepción: Cripto";
const syntheticQaCampaign = {
  affectedArea: "Prueba E2E staging",
  instagramHandle: "vendonar_test",
  organization: "Equipo Vendonar QA",
  titlePrefix: "Campaña E2E ",
};

type PublicCampaignRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsible_person_name: string;
  responsible_organization: string | null;
  instagram_handle: string | null;
  cover_image_path: string | null;
  location: string | null;
  affected_area: string | null;
  status: "active" | "paused" | "completed";
  total_verified_donations_usd: number | string | null;
  total_approved_purchases_usd: number | string | null;
  available_balance_usd: number | string | null;
};

type PublicPaymentMethodRow = {
  id: string;
  campaign_id: string;
  receiving_category: ReceivingCategory;
  method_name: string | null;
  currency: string | null;
  account_holder: string | null;
  transfer_instructions: string | null;
  notes: string | null;
};

type PublicDonationRow = {
  campaign_id: string;
  public_code: string;
  donor_name: string;
  amount_original: number | string;
  amount_usd_estimated: number | string | null;
  currency_original: string;
  public_message: string | null;
  verified_at: string | null;
  created_at: string;
};

type PublicPurchaseRow = {
  campaign_id: string;
  title: string;
  description: string | null;
  amount_original: number | string;
  amount_usd_estimated: number | string | null;
  currency_original: string;
  purchase_date: string | null;
  is_invoice_public: boolean;
  photo_file_path: string | null;
};

export async function getPublicCampaigns() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: campaignRows, error } = await supabase
      .from("public_campaigns")
      .select("*")
      .order("published_at", { ascending: false });

    if (error || !campaignRows) {
      return campaigns;
    }

    return await hydrateCampaignRows(
      (campaignRows as PublicCampaignRow[]).filter(
        (campaign) => !isSyntheticQaCampaign(campaign),
      ),
    );
  } catch {
    return campaigns;
  }
}

export async function getPublicCampaign(slug: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: campaignRow, error } = await supabase
      .from("public_campaigns")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !campaignRow) {
      return campaigns.find((campaign) => campaign.slug === slug);
    }

    const [campaign] = await hydrateCampaignRows([
      campaignRow as PublicCampaignRow,
    ]);

    return campaign;
  } catch {
    return campaigns.find((campaign) => campaign.slug === slug);
  }
}

async function hydrateCampaignRows(campaignRows: PublicCampaignRow[]) {
  if (campaignRows.length === 0) {
    return [];
  }

  const campaignIds = campaignRows.map((campaign) => campaign.id);
  const supabase = await createServerSupabaseClient();
  const [{ data: paymentRows }, { data: donationRows }, { data: purchaseRows }] =
    await Promise.all([
      supabase
        .from("public_campaign_payment_methods")
        .select("*")
        .in("campaign_id", campaignIds),
      supabase.from("public_donations").select("*").in("campaign_id", campaignIds),
      supabase.from("public_purchases").select("*").in("campaign_id", campaignIds),
    ]);

  const hydratedCampaigns = await Promise.allSettled(campaignRows.map(async (campaign): Promise<Campaign> => {
    const paymentMethods = ((paymentRows ?? []) as PublicPaymentMethodRow[])
      .filter((method) => method.campaign_id === campaign.id)
      .map((method) => ({
        id: method.id,
        receivingCategory: normalizeReceivingCategory(method),
        label: method.method_name ?? "Método de pago",
        currency: method.currency ?? "",
        accountHolder: method.account_holder ?? "",
        instructions: method.transfer_instructions ?? "",
        notes: method.notes ?? undefined,
      }));

    return {
      slug: campaign.slug,
      creatorAccessCode: "",
      title: campaign.title,
      description: campaign.description,
      responsible: campaign.responsible_person_name,
      responsibleEmail: "",
      instagramHandle: campaign.instagram_handle ?? undefined,
      organization: campaign.responsible_organization ?? undefined,
      coverImageUrl: await createStorageSignedUrl(
        supabase,
        "campaign-assets",
        campaign.cover_image_path,
      ),
      location: campaign.location ?? campaign.affected_area ?? "Sin zona",
      affectedArea: campaign.affected_area ?? "Sin zona",
      status: campaign.status,
      receivingCategories: Array.from(
        new Set(paymentMethods.map((method) => method.receivingCategory)),
      ),
      totals: {
        donated: toNumber(campaign.total_verified_donations_usd),
        spent: toNumber(campaign.total_approved_purchases_usd),
        balance: toNumber(campaign.available_balance_usd),
      },
      paymentMethods,
      donations: ((donationRows ?? []) as PublicDonationRow[])
        .filter((donation) => donation.campaign_id === campaign.id)
        .map((donation) => ({
          code: donation.public_code,
          donor: donation.donor_name,
          amount: formatOriginalAndUsd({
            amountOriginal: donation.amount_original,
            amountUsdEstimated: donation.amount_usd_estimated,
            currencyOriginal: donation.currency_original,
          }),
          message: donation.public_message ?? undefined,
          date: formatDate(donation.verified_at ?? donation.created_at),
        })),
      purchases: await Promise.all(((purchaseRows ?? []) as PublicPurchaseRow[])
        .filter((purchase) => purchase.campaign_id === campaign.id)
        .map(async (purchase) => ({
            title: purchase.title,
            description: purchase.description ?? undefined,
            amount: formatOriginalAndUsd({
              amountOriginal: purchase.amount_original,
              amountUsdEstimated: purchase.amount_usd_estimated,
              currencyOriginal: purchase.currency_original,
            }),
            date: purchase.purchase_date
              ? formatDate(purchase.purchase_date)
              : "Sin fecha",
            invoicePublic: purchase.is_invoice_public,
            photoUrl: await createStorageSignedUrl(
              supabase,
              "purchase-documents",
              purchase.photo_file_path,
            ),
          }))),
    };
  }));

  return hydratedCampaigns.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : toFallbackCampaign(campaignRows[index]),
  );
}

function normalizeReceivingCategory(method: PublicPaymentMethodRow) {
  if (
    method.receiving_category === "international" &&
    method.notes?.includes(cryptoCategoryMarker)
  ) {
    return "crypto";
  }

  return method.receiving_category;
}

function isSyntheticQaCampaign(campaign: PublicCampaignRow) {
  return (
    campaign.title.startsWith(syntheticQaCampaign.titlePrefix) &&
    campaign.affected_area === syntheticQaCampaign.affectedArea &&
    campaign.instagram_handle === syntheticQaCampaign.instagramHandle &&
    campaign.responsible_organization === syntheticQaCampaign.organization
  );
}

async function createStorageSignedUrl(
  supabase: SupabaseClient,
  bucket: "campaign-assets" | "purchase-documents",
  path: string | null,
) {
  if (!path) {
    return undefined;
  }

  try {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60);

    return data?.signedUrl ?? undefined;
  } catch {
    return undefined;
  }
}

async function createServerSupabaseClient() {
  return createPublicClient();
}

function toNumber(value: number | string | null) {
  return Number(value ?? 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toFallbackCampaign(campaign: PublicCampaignRow): Campaign {
  return {
    slug: campaign.slug,
    creatorAccessCode: "",
    title: campaign.title,
    description: campaign.description,
    responsible: campaign.responsible_person_name,
    responsibleEmail: "",
    instagramHandle: campaign.instagram_handle ?? undefined,
    organization: campaign.responsible_organization ?? undefined,
    coverImageUrl: undefined,
    location: campaign.location ?? campaign.affected_area ?? "Sin zona",
    affectedArea: campaign.affected_area ?? "Sin zona",
    status: campaign.status,
    receivingCategories: [],
    totals: {
      donated: toNumber(campaign.total_verified_donations_usd),
      spent: toNumber(campaign.total_approved_purchases_usd),
      balance: toNumber(campaign.available_balance_usd),
    },
    paymentMethods: [],
    donations: [],
    purchases: [],
  };
}
