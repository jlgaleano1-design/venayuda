import { NextResponse } from "next/server";
import { z } from "zod";
import { publishCampaign } from "@/lib/campaign-publication";
import { translateCampaignContent } from "@/lib/campaign-translation";
import { queueOrSendEmailEvent } from "@/lib/email-queue";
import { getActiveAdminProfile } from "@/lib/admin-auth";
import { getPublicCampaignUrl } from "@/lib/public-campaign-url";
import { createCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const cryptoCategoryMarker = "Categoría de recepción: Cripto";
const duplicateCampaignLimitMessage =
  "Este correo ya tiene una campaña registrada. Para evitar spam, solo se puede crear una campaña por correo.";

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
  publishAsVerified: z.boolean().optional(),
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
  const activeAdminProfile = await getRequestAdminProfile();
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

  const existingCampaignResult = await findExistingCampaignByEmail(
    supabase,
    contactEmail,
  );

  if (existingCampaignResult.error) {
    return NextResponse.json(
      {
        error:
          "No pudimos validar este correo en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }

  if (existingCampaignResult.exists) {
    return NextResponse.json(
      {
        error: duplicateCampaignLimitMessage,
      },
      { status: 409 },
    );
  }

  const translation = await translateCampaignContent({
    description: requestData.description,
    title: requestData.title,
  });
  const campaignInsert = {
    affected_area: requestData.affectedArea,
    contact_email: contactEmail,
    contact_info: `Correo: ${contactEmail}`,
    cover_image_path: requestData.coverImageName || null,
    description: requestData.description,
    description_en: translation.descriptionEn,
    instagram_handle: normalizeInstagramHandle(requestData.instagramHandle),
    location: requestData.affectedArea,
    responsible_organization: requestData.organization || null,
    responsible_person_name: requestData.responsibleName,
    slug: requestData.slug,
    status: "pending_review" as const,
    title: requestData.title,
    title_en: translation.titleEn,
    verification_status: "pending" as const,
  };
  const { data: campaign, error: campaignError } = await insertCampaign(
    supabase,
    campaignInsert,
  );

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
          ? duplicateCampaignLimitMessage
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
        publicCampaignUrl: getPublicCampaignUrl({
          siteUrl,
          slug: requestData.slug,
        }),
        requestData,
        reviewedBy:
          requestData.publishAsVerified && activeAdminProfile
            ? activeAdminProfile.user_id
            : undefined,
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
    publicCampaignUrl: getPublicCampaignUrl({
      siteUrl,
      slug: requestData.slug,
    }),
    requestData,
    reviewedBy:
      requestData.publishAsVerified && activeAdminProfile
        ? activeAdminProfile.user_id
        : undefined,
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

async function findExistingCampaignByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  contactEmail: string,
) {
  const byEmailColumn = await supabase
    .from("campaigns")
    .select("id")
    .eq("contact_email", contactEmail)
    .maybeSingle();

  if (!byEmailColumn.error) {
    return { exists: Boolean(byEmailColumn.data) };
  }

  if (!isMissingContactEmailSchema(byEmailColumn.error)) {
    return { error: byEmailColumn.error, exists: false };
  }

  const byContactInfo = await supabase
    .from("campaigns")
    .select("id")
    .ilike("contact_info", `%${escapeLikePattern(contactEmail)}%`)
    .limit(1)
    .maybeSingle();

  if (byContactInfo.error) {
    return { error: byContactInfo.error, exists: false };
  }

  return { exists: Boolean(byContactInfo.data) };
}

async function insertCampaign(
  supabase: ReturnType<typeof createAdminClient>,
  campaignInsert: {
    affected_area: string;
    contact_email: string;
    contact_info: string;
    cover_image_path: string | null;
    description: string;
    description_en: string | null;
    instagram_handle: string | null;
    location: string;
    responsible_organization: string | null;
    responsible_person_name: string;
    slug: string;
    status: "pending_review";
    title: string;
    title_en: string | null;
    verification_status: "pending";
  },
) {
  const insertResult = await tryInsertCampaign(supabase, campaignInsert);

  if (!insertResult.error) {
    return insertResult;
  }

  const shouldRemoveContactEmail = isMissingContactEmailSchema(
    insertResult.error,
  );
  const shouldRemoveTranslations = isMissingCampaignTranslationSchema(
    insertResult.error,
  );

  if (!shouldRemoveContactEmail && !shouldRemoveTranslations) {
    return insertResult;
  }

  const fallbackCampaignInsert = toSchemaCompatibleCampaignInsert(
    campaignInsert,
    {
      includeContactEmail: !shouldRemoveContactEmail,
      includeTranslations: !shouldRemoveTranslations,
    },
  );
  const fallbackInsertResult = await tryInsertCampaign(
    supabase,
    fallbackCampaignInsert,
  );

  if (
    !fallbackInsertResult.error ||
    (!isMissingContactEmailSchema(fallbackInsertResult.error) &&
      !isMissingCampaignTranslationSchema(fallbackInsertResult.error))
  ) {
    return fallbackInsertResult;
  }

  return tryInsertCampaign(
    supabase,
    toSchemaCompatibleCampaignInsert(campaignInsert, {
      includeContactEmail: false,
      includeTranslations: false,
    }),
  );
}

function tryInsertCampaign(
  supabase: ReturnType<typeof createAdminClient>,
  campaignInsert: Record<string, string | null>,
) {
  return supabase
    .from("campaigns")
    .insert(campaignInsert)
    .select("id, title")
    .single();
}

function toSchemaCompatibleCampaignInsert(
  campaignInsert: {
    affected_area: string;
    contact_email: string;
    contact_info: string;
    cover_image_path: string | null;
    description: string;
    description_en: string | null;
    instagram_handle: string | null;
    location: string;
    responsible_organization: string | null;
    responsible_person_name: string;
    slug: string;
    status: "pending_review";
    title: string;
    title_en: string | null;
    verification_status: "pending";
  },
  {
    includeContactEmail,
    includeTranslations,
  }: {
    includeContactEmail: boolean;
    includeTranslations: boolean;
  },
) {
  const compatibleInsert: Record<string, string | null> = {
    affected_area: campaignInsert.affected_area,
    contact_info: campaignInsert.contact_info,
    cover_image_path: campaignInsert.cover_image_path,
    description: campaignInsert.description,
    instagram_handle: campaignInsert.instagram_handle,
    location: campaignInsert.location,
    responsible_organization: campaignInsert.responsible_organization,
    responsible_person_name: campaignInsert.responsible_person_name,
    slug: campaignInsert.slug,
    status: campaignInsert.status,
    title: campaignInsert.title,
    verification_status: campaignInsert.verification_status,
  };

  if (includeContactEmail) {
    compatibleInsert.contact_email = campaignInsert.contact_email;
  }

  if (includeTranslations) {
    compatibleInsert.description_en = campaignInsert.description_en;
    compatibleInsert.title_en = campaignInsert.title_en;
  }

  return compatibleInsert;
}

function isMissingContactEmailSchema(error?: { message?: string } | null) {
  return /contact_email|schema cache/i.test(error?.message ?? "");
}

function isMissingCampaignTranslationSchema(
  error?: { message?: string } | null,
) {
  return /description_en|title_en|schema cache/i.test(error?.message ?? "");
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function finalizeCampaignRequest({
  campaignId,
  publicCampaignUrl,
  requestData,
  reviewedBy,
  siteUrl,
  supabase,
}: {
  campaignId: string;
  publicCampaignUrl: string;
  requestData: z.infer<typeof campaignRequestSchema>;
  reviewedBy?: string;
  siteUrl: string;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const shouldPublishRequestInstantly = Boolean(
    requestData.publishAsVerified && reviewedBy,
  );

  if (shouldPublishRequestInstantly) {
    const publicationResult = await publishCampaign({
      campaignId,
      reviewedBy,
      siteUrl,
      supabase,
    });

    if (publicationResult.error) {
      return NextResponse.json(
        { error: publicationResult.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      approvalEmailQueued: false,
      approvalEmailSent: false,
      confirmationEmailQueued: false,
      confirmationEmailSent: false,
      confirmationRecipientEmail: requestData.email,
      creatorAccessLink: publicationResult.creatorAccessUrl,
      publicCampaignUrl: publicationResult.publicCampaignUrl,
      publicationFlow: "instant",
      published: true,
      reason: null,
    });
  }

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
    publicationFlow: "email_confirmation",
    published: false,
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

async function getRequestAdminProfile() {
  try {
    const { profile } = await getActiveAdminProfile();

    return profile;
  } catch {
    return null;
  }
}
