import type { Campaign, ReceivingCategory } from "@/lib/demo-data";
import { campaigns } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

type PublicCampaignRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsible_person_name: string;
  responsible_organization: string | null;
  instagram_handle: string | null;
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
  receiving_category: Exclude<ReceivingCategory, "all">;
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
  amount: number | string;
  currency: string;
  public_message: string | null;
  verified_at: string | null;
  created_at: string;
};

type PublicPurchaseRow = {
  campaign_id: string;
  title: string;
  description: string | null;
  amount: number | string;
  currency: string;
  purchase_date: string | null;
  is_invoice_public: boolean;
  photo_file_path: string | null;
};

export async function getPublicCampaigns() {
  try {
    const supabase = await createClient();
    const { data: campaignRows, error } = await supabase
      .from("public_campaigns")
      .select("*")
      .order("published_at", { ascending: false });

    if (error || !campaignRows) {
      return campaigns;
    }

    return await hydrateCampaignRows(campaignRows as PublicCampaignRow[]);
  } catch {
    return campaigns;
  }
}

export async function getPublicCampaign(slug: string) {
  const publicCampaigns = await getPublicCampaigns();

  return publicCampaigns.find((campaign) => campaign.slug === slug);
}

async function hydrateCampaignRows(campaignRows: PublicCampaignRow[]) {
  if (campaignRows.length === 0) {
    return [];
  }

  const campaignIds = campaignRows.map((campaign) => campaign.id);
  const supabase = await createClient();
  const [{ data: paymentRows }, { data: donationRows }, { data: purchaseRows }] =
    await Promise.all([
      supabase
        .from("public_campaign_payment_methods")
        .select("*")
        .in("campaign_id", campaignIds),
      supabase.from("public_donations").select("*").in("campaign_id", campaignIds),
      supabase.from("public_purchases").select("*").in("campaign_id", campaignIds),
    ]);

  return Promise.all(campaignRows.map(async (campaign): Promise<Campaign> => {
    const paymentMethods = ((paymentRows ?? []) as PublicPaymentMethodRow[])
      .filter((method) => method.campaign_id === campaign.id)
      .map((method) => ({
        id: method.id,
        receivingCategory: method.receiving_category,
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
          amount: `${donation.amount} ${donation.currency}`,
          message: donation.public_message ?? undefined,
          date: formatDate(donation.verified_at ?? donation.created_at),
        })),
      purchases: await Promise.all(((purchaseRows ?? []) as PublicPurchaseRow[])
        .filter((purchase) => purchase.campaign_id === campaign.id)
        .map(async (purchase) => ({
            title: purchase.title,
            description: purchase.description ?? undefined,
            amount: `${purchase.amount} ${purchase.currency}`,
            date: purchase.purchase_date
              ? formatDate(purchase.purchase_date)
              : "Sin fecha",
            invoicePublic: purchase.is_invoice_public,
            photoUrl: await createPurchaseDocumentUrl(
              supabase,
              purchase.photo_file_path,
            ),
          }))),
    };
  }));
}

async function createPurchaseDocumentUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) {
    return undefined;
  }

  const { data } = await supabase.storage
    .from("purchase-documents")
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? undefined;
}

function toNumber(value: number | string | null) {
  return Number(value ?? 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
