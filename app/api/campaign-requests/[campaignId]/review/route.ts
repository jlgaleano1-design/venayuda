import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publishCampaign } from "@/lib/campaign-publication";
import { verifyCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const decision = requestUrl.searchParams.get("decision") ?? "approve";

  if (!verifyCampaignReviewToken(token, campaignId)) {
    return NextResponse.json(
      { error: "Este enlace de confirmación no es válido o venció." },
      { status: 403 },
    );
  }

  if (decision !== "approve") {
    return redirectBack(requestUrl, campaignId, "invalid");
  }

  return approveCampaign(requestUrl, campaignId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";

  if (!verifyCampaignReviewToken(token, campaignId)) {
    return NextResponse.json(
      { error: "Este enlace de confirmación no es válido o venció." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return NextResponse.json(
      { error: "Decisión inválida." },
      { status: 400 },
    );
  }

  if (payload.data.decision === "reject") {
    return rejectCampaign(requestUrl, campaignId);
  }

  return approveCampaign(requestUrl, campaignId);
}

async function approveCampaign(requestUrl: URL, campaignId: string) {
  const supabase = createAdminClient();
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin,
  );
  const publicationResult = await publishCampaign({
    campaignId,
    siteUrl,
    supabase,
  });

  if (publicationResult.error === "No encontramos la solicitud.") {
    return NextResponse.json(
      { error: publicationResult.error },
      { status: 404 },
    );
  }

  if (publicationResult.error) {
    return NextResponse.json(
      { error: publicationResult.error },
      { status: 500 },
    );
  }

  return redirectToPublishedReview(requestUrl, campaignId);
}

async function rejectCampaign(requestUrl: URL, campaignId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("campaigns")
    .update({
      status: "archived",
      verification_status: "rejected",
    })
    .eq("id", campaignId);

  revalidatePath("/admin");

  return redirectBack(requestUrl, campaignId, "rejected");
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function redirectBack(requestUrl: URL, campaignId: string, status: string) {
  const redirectUrl = new URL(`/revisar/campana/${campaignId}`, requestUrl);
  redirectUrl.searchParams.set("status", status);
  const token = requestUrl.searchParams.get("token");

  if (token) {
    redirectUrl.searchParams.set("token", token);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function redirectToPublishedReview(requestUrl: URL, campaignId: string) {
  const redirectUrl = new URL(`/revisar/campana/${campaignId}`, requestUrl);
  redirectUrl.searchParams.set("status", "published");
  const token = requestUrl.searchParams.get("token");

  if (token) {
    redirectUrl.searchParams.set("token", token);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
