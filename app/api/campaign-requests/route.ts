import { NextResponse } from "next/server";
import { z } from "zod";
import { queueOrSendEmailEvent } from "@/lib/email-queue";
import { createCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const cryptoCategoryMarker = "Categoría de recepción: Cripto";

const paymentMethodSchema = z.object({
  accountHolder: z.string().min(1),
  accountReference: z.string().min(1),
  bank: z.string().min(1),
  methodName: z.string().min(1),
  receivingCategory: z.enum([
    "crypto",
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
  const contactEmail = normalizeEmail(requestData.email);
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

  const { data: existingCampaign, error: existingCampaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("contact_email", contactEmail)
    .maybeSingle();

  if (existingCampaignError) {
    return NextResponse.json(
      {
        error:
          "No pudimos validar este correo en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  if (existingCampaign) {
    return NextResponse.json(
      {
        error:
          "Este correo ya tiene una campaña registrada. Para evitar spam, solo se puede crear una campaña por correo.",
      },
      { status: 409 },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      affected_area: requestData.affectedArea,
      contact_email: contactEmail,
      contact_info: `Correo: ${contactEmail}`,
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
      campaignError?.code === "23505" &&
      /slug|campaigns_slug_key/i.test(campaignError?.message ?? "");
    const duplicateEmail =
      campaignError?.code === "23505" &&
      /contact_email|campaigns_contact_email_unique/i.test(
        campaignError?.message ?? "",
      );

    return NextResponse.json(
      {
        error: duplicateEmail
          ? "Este correo ya tiene una campaña registrada. Para evitar spam, solo se puede crear una campaña por correo."
          : duplicateSlug
            ? "Ese link personalizado ya está usado. Prueba con otro."
            : "No se pudo guardar la solicitud.",
      },
      { status: duplicateSlug || duplicateEmail ? 409 : 500 },
    );
  }

  const methodRows = requestData.paymentMethods.map((method) =>
    toPaymentMethodRow({
      campaignId: campaign.id,
      method,
      useCryptoFallback: false,
    }),
  );
  const { error: methodsError } = await supabase
    .from("campaign_payment_methods")
    .insert(methodRows);

  if (methodsError && shouldRetryWithCryptoFallback(methodsError, requestData)) {
    const fallbackRows = requestData.paymentMethods.map((method) =>
      toPaymentMethodRow({
        campaignId: campaign.id,
        method,
        useCryptoFallback: true,
      }),
    );
    const { error: fallbackMethodsError } = await supabase
      .from("campaign_payment_methods")
      .insert(fallbackRows);

    if (!fallbackMethodsError) {
      return await finalizeCampaignRequest({
        campaignId: campaign.id,
        publicCampaignUrl: new URL(
          `/campanas/${requestData.slug}`,
          siteUrl,
        ).toString(),
        requestData,
        siteUrl,
        supabase,
      });
    }
  }

  if (methodsError) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);

    return NextResponse.json(
      { error: "No se pudieron guardar los métodos de pago." },
      { status: 500 },
    );
  }

  return await finalizeCampaignRequest({
    campaignId: campaign.id,
    publicCampaignUrl: new URL(
      `/campanas/${requestData.slug}`,
      siteUrl,
    ).toString(),
    requestData,
    siteUrl,
    supabase,
  });
}

function toPaymentMethodRow({
  campaignId,
  method,
  useCryptoFallback,
}: {
  campaignId: string;
  method: z.infer<typeof paymentMethodSchema>;
  useCryptoFallback: boolean;
}) {
  const isCrypto = method.receivingCategory === "crypto";
  const notes = [
    isCrypto ? cryptoCategoryMarker : "",
    `Banco, plataforma o método: ${method.bank}`,
    `Cuenta, correo, wallet o ID: ${method.accountReference}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    account_holder: method.accountHolder,
    campaign_id: campaignId,
    method_name: method.methodName,
    notes,
    receiving_category:
      useCryptoFallback && isCrypto ? "international" : method.receivingCategory,
    transfer_instructions: [
      method.transferInstructions,
      `Banco, plataforma o método: ${method.bank}`,
      `Cuenta, correo, wallet o ID: ${method.accountReference}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function shouldRetryWithCryptoFallback(
  error: { code?: string; message?: string },
  requestData: z.infer<typeof campaignRequestSchema>,
) {
  return (
    requestData.paymentMethods.some(
      (method) => method.receivingCategory === "crypto",
    ) &&
    (error.code === "22P02" ||
      /crypto|receiving_category|invalid input value for enum/i.test(
        error.message ?? "",
      ))
  );
}

async function finalizeCampaignRequest({
  campaignId,
  publicCampaignUrl,
  requestData,
  siteUrl,
  supabase,
}: {
  campaignId: string;
  publicCampaignUrl: string;
  requestData: z.infer<typeof campaignRequestSchema>;
  siteUrl: string;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  let confirmationEmailResult: {
    queued: boolean;
    reason?: string;
    sent: boolean;
  } = {
    queued: false,
    reason: "el servicio de correo no está disponible",
    sent: false,
  };

  if (!process.env.CAMPAIGN_REVIEW_SECRET) {
    confirmationEmailResult = {
      queued: false,
      reason: "el enlace de confirmación necesita configuración interna",
      sent: false,
    };
  } else {
    const reviewToken = createCampaignReviewToken(campaignId);
    const confirmationUrl = new URL(
      `/api/campaign-requests/${campaignId}/review`,
      siteUrl,
    );
    confirmationUrl.searchParams.set("token", reviewToken);
    confirmationUrl.searchParams.set("decision", "approve");
    const reviewUrl = new URL(`/revisar/campana/${campaignId}`, siteUrl);
    reviewUrl.searchParams.set("token", reviewToken);

    try {
      confirmationEmailResult = await queueOrSendEmailEvent(
        supabase,
        "campaign_review",
        {
          affectedArea: requestData.affectedArea,
          approvalUrl: confirmationUrl.toString(),
          contactEmail: requestData.email,
          description: requestData.description,
          instagramHandle: requestData.instagramHandle,
          organization: requestData.organization,
          paymentMethods: requestData.paymentMethods,
          publicCampaignUrl,
          recipientEmail: requestData.email,
          reviewUrl: reviewUrl.toString(),
          responsibleName: requestData.responsibleName,
          slug: requestData.slug,
          title: requestData.title,
        },
      );
    } catch {
      confirmationEmailResult = {
        queued: false,
        reason: "No se pudo poner en cola el correo de confirmación",
        sent: false,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    approvalEmailQueued: confirmationEmailResult.queued,
    approvalEmailSent: confirmationEmailResult.sent,
    confirmationEmailQueued: confirmationEmailResult.queued,
    confirmationEmailSent: confirmationEmailResult.sent,
    confirmationRecipientEmail: requestData.email,
    creatorAccessLink: null,
    publicCampaignUrl,
    reason: confirmationEmailResult.reason,
  });
}

function normalizeInstagramHandle(value?: string) {
  return value?.replace(/^@/, "").trim() || null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}
