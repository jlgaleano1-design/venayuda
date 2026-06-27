import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueEmailEvent } from "@/lib/email-queue";
import { createCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const paymentMethodSchema = z.object({
  accountHolder: z.string().min(1),
  accountReference: z.string().min(1),
  bank: z.string().min(1),
  methodName: z.string().min(1),
  receivingCategory: z.enum([
    "mexico",
    "united_states",
    "venezuela",
    "spain",
    "panama",
    "colombia",
    "chile",
    "argentina",
    "international",
    "other",
  ]),
  transferInstructions: z.string().optional(),
});

const campaignRequestSchema = z.object({
  affectedArea: z.string().min(1),
  coverImageName: z.string().optional(),
  description: z.string().min(1),
  email: z.string().email(),
  instagramHandle: z.string().optional(),
  organization: z.string().optional(),
  paymentMethods: z.array(paymentMethodSchema).min(1),
  responsibleName: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = campaignRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Revisa los datos de la solicitud." },
      { status: 400 },
    );
  }

  const requestData = payload.data;
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "https://vendonar.com",
  );

  let supabase;

  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos recibir la solicitud en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      affected_area: requestData.affectedArea,
      contact_info: `Correo: ${requestData.email}`,
      cover_image_path: requestData.coverImageName || null,
      description: requestData.description,
      instagram_handle: normalizeInstagramHandle(requestData.instagramHandle),
      location: requestData.affectedArea,
      responsible_organization: requestData.organization || null,
      responsible_person_name: requestData.responsibleName,
      slug: requestData.slug,
      status: "pending_review",
      title: requestData.title,
      verification_status: "pending",
    })
    .select("id, title")
    .single();

  if (campaignError || !campaign) {
    const duplicateSlug =
      campaignError?.code === "23505" || campaignError?.message.includes("slug");

    return NextResponse.json(
      {
        error: duplicateSlug
          ? "Ese link personalizado ya está usado. Prueba con otro."
          : "No se pudo guardar la solicitud.",
      },
      { status: duplicateSlug ? 409 : 500 },
    );
  }

  const { error: methodsError } = await supabase
    .from("campaign_payment_methods")
    .insert(
      requestData.paymentMethods.map((method) => ({
        account_holder: method.accountHolder,
        campaign_id: campaign.id,
        method_name: method.methodName,
        notes: [`Banco: ${method.bank}`, `Cuenta / correo: ${method.accountReference}`].join(
          "\n",
        ),
        receiving_category: method.receivingCategory,
        transfer_instructions: [
          method.transferInstructions,
          `Banco: ${method.bank}`,
          `Cuenta / correo: ${method.accountReference}`,
        ]
          .filter(Boolean)
          .join("\n"),
      })),
    );

  if (methodsError) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);

    return NextResponse.json(
      { error: "No se pudieron guardar los métodos de pago." },
      { status: 500 },
    );
  }

  const publicCampaignUrl = new URL(
    `/campanas/${requestData.slug}`,
    siteUrl,
  ).toString();
  const recipientEmail = process.env.APPROVAL_RECIPIENT_EMAIL;

  let approvalEmailResult: { queued: boolean; reason?: string } = {
    queued: false,
    reason: "el servicio de correo no está disponible",
  };

  if (recipientEmail) {
    if (!process.env.CAMPAIGN_REVIEW_SECRET) {
      approvalEmailResult = {
        queued: false,
        reason: "el enlace de revisión necesita configuración interna",
      };
    } else {
      const reviewToken = createCampaignReviewToken(campaign.id);
      const approvalUrl = new URL(
        `/api/campaign-requests/${campaign.id}/review`,
        siteUrl,
      );
      approvalUrl.searchParams.set("token", reviewToken);
      approvalUrl.searchParams.set("decision", "approve");
      const reviewUrl = new URL(`/revisar/campana/${campaign.id}`, siteUrl);
      reviewUrl.searchParams.set("token", reviewToken);

      try {
        approvalEmailResult = await enqueueEmailEvent(
          supabase,
          "campaign_review",
          {
            affectedArea: requestData.affectedArea,
            approvalUrl: approvalUrl.toString(),
            contactEmail: requestData.email,
            description: requestData.description,
            instagramHandle: requestData.instagramHandle,
            organization: requestData.organization,
            paymentMethods: requestData.paymentMethods,
            publicCampaignUrl,
            recipientEmail,
            reviewUrl: reviewUrl.toString(),
            responsibleName: requestData.responsibleName,
            slug: requestData.slug,
            title: requestData.title,
          },
        );
      } catch {
        approvalEmailResult = {
          queued: false,
          reason: "No se pudo poner en cola el correo de revisión",
        };
      }
    }
  }

  return NextResponse.json({
    ok: true,
    approvalEmailQueued: approvalEmailResult.queued,
    approvalEmailSent: approvalEmailResult.queued,
    creatorAccessLink: null,
    publicCampaignUrl,
    reason: approvalEmailResult.reason,
  });
}

function normalizeInstagramHandle(value?: string) {
  return value?.replace(/^@/, "").trim() || null;
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}
