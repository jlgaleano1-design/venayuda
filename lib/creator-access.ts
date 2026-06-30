import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatorAccessRecord = {
  id: string;
  campaign: {
    id: string;
    responsible: string;
    slug: string;
    title: string;
  };
};

export async function getCreatorAccessRecord(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();

  const { data: access } = await supabase
    .from("campaign_creator_access_links")
    .select("id, campaign_id, expires_at, is_active")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!access?.is_active || isExpired(access.expires_at)) {
    return null;
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, responsible_person_name, slug, title")
    .eq("id", access.campaign_id)
    .eq("status", "active")
    .in("verification_status", ["pending", "unverified", "verified"])
    .maybeSingle();

  if (!campaign) {
    return null;
  }

  await supabase
    .from("campaign_creator_access_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", access.id);

  return {
    id: access.id,
    campaign: {
      id: campaign.id,
      responsible: campaign.responsible_person_name,
      slug: campaign.slug,
      title: campaign.title,
    },
  } satisfies CreatorAccessRecord;
}

function isExpired(expiresAt?: string | null) {
  return expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
}
