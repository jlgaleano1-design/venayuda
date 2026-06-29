import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAdminProfile } from "@/lib/admin-auth";
import { publishCampaign } from "@/lib/campaign-publication";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const { profile, supabase } = await requireActiveAdminProfile();

  if (payload.data.decision === "reject") {
    const { error } = await supabase
      .from("campaigns")
      .update({
        reviewed_by: profile.user_id,
        status: "archived",
        verification_status: "rejected",
      })
      .eq("id", campaignId);

    revalidatePath("/admin");
    return redirectToAdmin(requestUrl, error ? "error" : "campaign-rejected");
  }

  const publicationResult = await publishCampaign({
    campaignId,
    reviewedBy: profile.user_id,
    siteUrl: normalizeSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin,
    ),
    supabase,
  });

  revalidatePath("/admin");

  return redirectToAdmin(
    requestUrl,
    publicationResult.error
      ? publicationResult.error === "No encontramos la solicitud."
        ? "missing"
        : "error"
      : "campaign-approved",
  );
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function redirectToAdmin(requestUrl: URL, status: string) {
  const redirectUrl = new URL("/admin", requestUrl);
  redirectUrl.searchParams.set("review", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
