import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { queueOrSendEmailEvent } from "@/lib/email-queue";
import { getHomePath, getPublicCampaignPath } from "@/lib/public-campaign-url";
import { createAdminClient } from "@/lib/supabase/admin";

type CampaignPublicationResult =
  | {
      campaignTitle: string;
      creatorAccessUrl: string | null;
      error?: never;
      publicCampaignUrl: string;
      slug: string;
    }
  | {
      campaignTitle?: never;
      creatorAccessUrl?: never;
      error: string;
      publicCampaignUrl?: never;
      slug?: never;
    };

type CampaignRow = {
  contact_info: string | null;
  id: string;
  slug: string;
  status: string;
  title: string;
};

export async function publishCampaign({
  campaignId,
  reviewedBy,
  siteUrl,
  supabase,
}: {
  campaignId: string;
  reviewedBy?: string;
  siteUrl: string;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<CampaignPublicationResult> {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, contact_info, slug, status, title")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return { error: "No encontramos la solicitud." };
  }

  const campaignRow = campaign as CampaignRow;
  const publicCampaignUrl = new URL(
    getPublicCampaignPath(campaignRow.slug),
    siteUrl,
  ).toString();

  if (campaignRow.status === "active") {
    revalidatePublishedCampaign(campaignRow.slug);

    return {
      campaignTitle: campaignRow.title,
      creatorAccessUrl: null,
      publicCampaignUrl,
      slug: campaignRow.slug,
    };
  }

  const creatorAccessToken = randomBytes(32).toString("base64url");
  const creatorAccessTokenHash = createHash("sha256")
    .update(creatorAccessToken)
    .digest("hex");
  const campaignUpdate: {
    published_at: string;
    reviewed_by?: string;
    status: "active";
    verification_status: "pending" | "verified";
  } = {
    published_at: new Date().toISOString(),
    status: "active",
    verification_status: reviewedBy ? "verified" : "pending",
  };
  const creatorAccessInsert: {
    campaign_id: string;
    created_by?: string;
    label: string;
    recipient_contact: string | null;
    token_hash: string;
  } = {
    campaign_id: campaignId,
    label: "Link privado del creador",
    recipient_contact: extractEmail(campaignRow.contact_info),
    token_hash: creatorAccessTokenHash,
  };

  if (reviewedBy) {
    campaignUpdate.reviewed_by = reviewedBy;
    creatorAccessInsert.created_by = reviewedBy;
  }

  const [{ error: updateError }, { error: accessError }] = await Promise.all([
    supabase
      .from("campaigns")
      .update(campaignUpdate)
      .eq("id", campaignId),
    supabase.from("campaign_creator_access_links").insert(creatorAccessInsert),
  ]);

  if (updateError || accessError) {
    return { error: "No se pudo publicar la campaña." };
  }

  revalidatePublishedCampaign(campaignRow.slug);

  const creatorAccessUrl = new URL(
    `/creador/${creatorAccessToken}`,
    siteUrl,
  ).toString();
  const responsibleEmail = extractEmail(campaignRow.contact_info);

  if (responsibleEmail) {
    try {
      await queueOrSendEmailEvent(supabase, "campaign_approved", {
        campaignTitle: campaignRow.title,
        creatorAccessUrl,
        publicCampaignUrl,
        recipientEmail: responsibleEmail,
      });
    } catch {
      // Publishing should remain valid even if email delivery needs retrying.
    }
  }

  return {
    campaignTitle: campaignRow.title,
    creatorAccessUrl,
    publicCampaignUrl,
    slug: campaignRow.slug,
  };
}

export function revalidatePublishedCampaign(slug: string) {
  revalidatePath(getHomePath("es"));
  revalidatePath(getHomePath("en"));
  revalidatePath(getPublicCampaignPath(slug, "es"));
  revalidatePath(getPublicCampaignPath(slug, "en"));
}

export function extractEmail(contactInfo?: string | null) {
  return contactInfo?.match(/[^\s:]+@[^\s]+/)?.[0] ?? null;
}
