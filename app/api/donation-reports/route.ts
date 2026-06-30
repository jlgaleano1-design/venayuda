import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { estimateUsdAmount, normalizeCurrency } from "@/lib/exchange-rates";
import { getPublicCampaignUrl } from "@/lib/public-campaign-url";
import { createDonationReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const donationReportSchema = z.object({
  campaignSlug: z.string().min(1),
  donorName: z.string().optional(),
  donorEmail: z.string().email().optional().or(z.literal("")),
  isAnonymous: z.boolean().optional(),
  amount: z.string().min(1),
  currency: z.string().min(1),
  transferDate: z.string().optional(),
  paymentMethodUsed: z.string().optional(),
  transferReference: z.string().optional(),
  proofFileName: z.string().optional(),
  proofFilePath: z.string().optional(),
  publicMessage: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = donationReportSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Datos incompletos para avisar la donación." },
      { status: 400 },
    );
  }

  const report = payload.data;
  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos recibir el reporte en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  const campaign = await getPublishedCampaignForReport(
    supabase,
    report.campaignSlug,
  );

  if (!campaign) {
    return NextResponse.json(
      { error: "No encontramos la campaña." },
      { status: 404 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "https://vendonar.com";
  const campaignUrl = getPublicCampaignUrl({
    siteUrl,
    slug: campaign.slug,
  });

  const numericAmount = Number(report.amount);
  const currency = normalizeCurrency(report.currency);
  const proofFilePath = report.proofFilePath ?? report.proofFileName ?? "";

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "El monto del reporte no es válido." },
      { status: 400 },
    );
  }

  const usdEstimate = await estimateUsdAmount({
    amount: numericAmount,
    currency,
  });

  if ("error" in usdEstimate) {
    return NextResponse.json(
      { error: usdEstimate.error },
      { status: 422 },
    );
  }

  const paymentMethod = report.paymentMethodUsed
    ? await findPaymentMethod(supabase, campaign.id, report.paymentMethodUsed)
    : null;
  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .insert({
      amount_original: numericAmount,
      amount_usd_estimated: usdEstimate.amount,
      campaign_id: campaign.id,
      conversion_notes: usdEstimate.conversionNotes,
      currency_original: currency,
      donor_contact: normalizeOptionalText(report.donorEmail),
      donor_name: report.donorName || null,
      exchange_rate_date: usdEstimate.exchangeRateDate,
      exchange_rate_source: usdEstimate.exchangeRateSource,
      exchange_rate_used: usdEstimate.exchangeRateUsed,
      is_anonymous: Boolean(report.isAnonymous),
      payment_method_id: paymentMethod?.id ?? null,
      proof_file_path: proofFilePath || null,
      public_message: report.publicMessage || null,
      status: "pending",
      transfer_date: report.transferDate || null,
      transfer_reference: report.transferReference || null,
    })
    .select("id, public_code")
    .single();

  if (donationError || !donation) {
    return NextResponse.json(
      { error: "No pudimos registrar el aviso de donación." },
      { status: 500 },
    );
  }

  const reviewToken = createDonationReviewToken(donation.id);
  const approvalUrl = new URL(
    `/api/donation-reports/${donation.id}/review`,
    siteUrl,
  );
  approvalUrl.searchParams.set("token", reviewToken);
  approvalUrl.searchParams.set("decision", "approve");
  const rejectionUrl = new URL(
    `/api/donation-reports/${donation.id}/review`,
    siteUrl,
  );
  rejectionUrl.searchParams.set("token", reviewToken);
  rejectionUrl.searchParams.set("decision", "reject");

  const [reportResult, confirmationResult] = await Promise.all([
    safeQueueEmail(
      campaign.responsibleEmail
        ? enqueueEmailEvent(supabase, "donation_report", {
            campaignTitle: campaign.title,
            recipientEmail: campaign.responsibleEmail,
            donorName: report.donorName,
            donorEmail: report.donorEmail,
            amount: report.amount,
            currency,
            transferDate: report.transferDate,
            paymentMethod: report.paymentMethodUsed,
            transferReference: report.transferReference,
            proofFileName: proofFilePath,
            publicMessage: report.publicMessage,
            approvalUrl: approvalUrl.toString(),
            rejectionUrl: rejectionUrl.toString(),
          })
        : Promise.resolve({
            queued: false,
            reason: "La campaña no tiene correo de responsable.",
          }),
    ),
    report.donorEmail
      ? safeQueueEmail(
          enqueueEmailEvent(supabase, "donation_confirmation", {
            campaignTitle: campaign.title,
            campaignUrl,
            recipientEmail: report.donorEmail,
          }),
        )
      : Promise.resolve({
          queued: false,
          reason: "El reporte no incluyó correo de contacto.",
        }),
  ]);

  return NextResponse.json({
    ok: true,
    publicCode: donation.public_code,
    emailQueued: reportResult.queued,
    confirmationEmailQueued: confirmationResult.queued,
    emailSent: reportResult.queued,
    confirmationEmailSent: confirmationResult.queued,
    reason:
      "reason" in reportResult
        ? reportResult.reason
        : "reason" in confirmationResult
          ? confirmationResult.reason
          : undefined,
  });
}

async function getPublishedCampaignForReport(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string,
) {
  try {
    const { data } = await supabase
      .from("campaigns")
      .select("id, slug, title, contact_info")
      .eq("slug", slug)
      .eq("status", "active")
      .in("verification_status", ["pending", "unverified", "verified"])
      .single();

    if (!data) {
      return null;
    }

    return {
      id: data.id as string,
      slug: data.slug as string,
      title: data.title as string,
      responsibleEmail: extractEmail(String(data.contact_info ?? "")),
    };
  } catch {
    return null;
  }
}

async function findPaymentMethod(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  paymentMethodUsed: string,
) {
  const { data } = await supabase
    .from("campaign_payment_methods")
    .select("id, method_name")
    .eq("campaign_id", campaignId)
    .eq("is_active", true);

  return (data ?? []).find(
    (method) =>
      String(method.method_name ?? "").toLowerCase() ===
      paymentMethodUsed.toLowerCase(),
  );
}

function extractEmail(value: string) {
  return value.match(/[^\s:@]+@[^\s@]+\.[^\s@]+/)?.[0] ?? "";
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

async function safeQueueEmail(
  emailPromise: Promise<{ queued: boolean; reason?: string }>,
) {
  try {
    return await emailPromise;
  } catch {
    return {
      queued: false,
      reason:
        "El reporte quedó registrado, pero no se pudo poner el correo en cola.",
    };
  }
}
