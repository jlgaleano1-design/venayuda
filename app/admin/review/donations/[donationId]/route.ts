import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAdminProfile } from "@/lib/admin-auth";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ donationId: string }> },
) {
  const { donationId } = await params;
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const payload = reviewSchema.safeParse({
    decision: formData.get("decision"),
  });

  if (!payload.success) {
    return redirectToAdmin(requestUrl, "invalid");
  }

  const { profile, supabase } = await requireActiveAdminProfile();
  const { data: donation } = await supabase
    .from("donations")
    .select("amount, currency")
    .eq("id", donationId)
    .single();

  if (!donation) {
    return redirectToAdmin(requestUrl, "missing");
  }

  if (payload.data.decision === "approve" && donation.currency !== "USD") {
    return redirectToAdmin(requestUrl, "currency");
  }

  const update =
    payload.data.decision === "approve"
      ? {
          amount_usd: Number(donation.amount),
          status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: profile.user_id,
        }
      : {
          rejected_at: new Date().toISOString(),
          rejected_by: profile.user_id,
          rejection_reason: "Rechazada desde panel admin",
          status: "rejected",
        };

  const { error } = await supabase
    .from("donations")
    .update(update)
    .eq("id", donationId);

  revalidatePath("/admin");
  return redirectToAdmin(
    requestUrl,
    error
      ? "error"
      : payload.data.decision === "approve"
        ? "donation-approved"
        : "donation-rejected",
  );
}

function redirectToAdmin(requestUrl: URL, status: string) {
  const redirectUrl = new URL("/admin", requestUrl);
  redirectUrl.searchParams.set("review", status);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
