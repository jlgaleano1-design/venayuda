import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreatorAccessRecord } from "@/lib/creator-access";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { createPurchaseReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const creatorUpdateSchema = z.object({
  campaignSlug: z.string().min(1),
  accessCode: z.string().min(1),
  purchaseId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  amountUsdEstimated: z.string().optional(),
  currency: z.string().min(1),
  purchaseDate: z.string().min(1),
  vendor: z.string().optional(),
  photoFileName: z.string().optional(),
  photoFilePath: z.string().optional(),
  invoiceFileName: z.string().optional(),
  invoiceFilePath: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = creatorUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Faltan datos para registrar la novedad." },
      { status: 400 },
    );
  }

  const update = payload.data;
  let accessRecord: Awaited<ReturnType<typeof getCreatorAccessRecord>>;

  try {
    accessRecord = await getCreatorAccessRecord(update.accessCode);
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos recibir la novedad en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  if (!accessRecord || accessRecord.campaign.slug !== update.campaignSlug) {
    return NextResponse.json(
      { error: "Este enlace no tiene acceso a la campaña." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const photoFilePath = update.photoFilePath ?? update.photoFileName ?? "";
  const invoiceFilePath = update.invoiceFilePath ?? update.invoiceFileName ?? "";
  const numericAmount = Number(update.amount);
  const amountUsdEstimated = parseOptionalPositiveNumber(
    update.amountUsdEstimated,
  );

  if (!photoFilePath) {
    return NextResponse.json(
      { error: "La foto de la compra es obligatoria." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "El monto de la compra no es válido." },
      { status: 400 },
    );
  }

  if (amountUsdEstimated === null) {
    return NextResponse.json(
      { error: "El equivalente aproximado en USD no es válido." },
      { status: 400 },
    );
  }

  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      ...(update.purchaseId ? { id: update.purchaseId } : {}),
      campaign_id: accessRecord.campaign.id,
      title: update.title,
      description: update.description || null,
      amount_original: numericAmount,
      amount_usd_estimated: amountUsdEstimated ?? null,
      currency_original: normalizeCurrency(update.currency),
      purchase_date: update.purchaseDate,
      vendor: update.vendor || null,
      photo_file_path: photoFilePath,
      invoice_file_path: invoiceFilePath || null,
      submitted_by_creator_access_id: accessRecord.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return NextResponse.json(
      { error: "No pudimos guardar la novedad." },
      { status: 500 },
    );
  }

  const recipientEmail = process.env.APPROVAL_RECIPIENT_EMAIL;
  let reviewEmailQueued = false;

  if (recipientEmail) {
    const siteUrl = normalizeSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ??
        request.headers.get("origin") ??
        "https://vendonar.com",
    );
    const reviewToken = createPurchaseReviewToken(purchase.id);
    const approvalUrl = new URL(
      `/api/creator-updates/${purchase.id}/review`,
      siteUrl,
    );
    approvalUrl.searchParams.set("token", reviewToken);
    approvalUrl.searchParams.set("decision", "approve");
    const rejectionUrl = new URL(
      `/api/creator-updates/${purchase.id}/review`,
      siteUrl,
    );
    rejectionUrl.searchParams.set("token", reviewToken);
    rejectionUrl.searchParams.set("decision", "reject");

    try {
      const result = await enqueueEmailEvent(supabase, "purchase_review", {
        amount: update.amount,
        approvalUrl: approvalUrl.toString(),
        campaignTitle: accessRecord.campaign.title,
        currency: normalizeCurrency(update.currency),
        description: update.description,
        purchaseDate: update.purchaseDate,
        recipientEmail,
        rejectionUrl: rejectionUrl.toString(),
        title: update.title,
        vendor: update.vendor,
      });
      reviewEmailQueued = result.queued;
    } catch {
      reviewEmailQueued = false;
    }
  }

  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    reviewEmailQueued,
    reviewEmailSent: reviewEmailQueued,
    status: "pending_review",
    message: "Novedad recibida y pendiente de revisión.",
  });
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase().slice(0, 12);
}

function parseOptionalPositiveNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}
