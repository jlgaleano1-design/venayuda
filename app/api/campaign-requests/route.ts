import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assessCampaignSpam,
  createStableHash,
  type CampaignSpamAssessment,
} from "@/lib/campaign-spam";
import { publishCampaign } from "@/lib/campaign-publication";
import { translateCampaignContent } from "@/lib/campaign-translation";
import { getActiveAdminProfile } from "@/lib/admin-auth";
import { queueOrSendEmailEvent } from "@/lib/email-queue";
import { createAdminClient } from "@/lib/supabase/admin";

const cryptoCategoryMarker = "Categoría de recepción: Cripto";
const duplicateCampaignLimitMessage =
  "Este correo ya tiene una campaña registrada. Para evitar spam, solo se puede crear una campaña por correo.";
const blockedCampaignRequestMessage =
  "No pudimos recibir esta solicitud. Si crees que es un error, escríbenos para revisarla.";
const turnstileVerificationUrl =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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
  coverImageName: z.string().min(1),
  description: z.string().min(1),
  email: z.string().email(),
  formStartedAt: z.number().optional(),
  honeypot: z.string().optional(),
  instagramHandle: z.string().min(1),
  organization: z.string().optional(),
  paymentMethods: z.array(paymentMethodSchema).min(1),
  publishAsVerified: z.boolean().optional(),
  responsibleName: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  turnstileToken: z.string().optional(),
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
  const requestMetadata = getRequestMetadata(request);
  const spamAssessment = assessCampaignSpam({
    description: requestData.description,
    email: contactEmail,
    formStartedAt: requestData.formStartedAt,
    honeypot: requestData.honeypot,
    instagramHandle: requestData.instagramHandle,
    organization: requestData.organization,
    responsibleName: requestData.responsibleName,
    slug: requestData.slug,
    title: requestData.title,
  });
  const activeAdminProfile = await getRequestAdminProfile();
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "https://vendonar.com",
  );
  const isLocalRequest = isLocalUrl(request.url) || isLocalUrl(siteUrl);

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

  const turnstileResult = await verifyTurnstileToken({
    ip: requestMetadata.ip,
    isLocalRequest,
    token: requestData.turnstileToken,
  });

  if (!turnstileResult.ok) {
    await recordCampaignRequestAuditEvent({
      blockReason: turnstileResult.reason,
      campaignId: null,
      contactEmail,
      eventType: "blocked",
      requestData,
      requestMetadata,
      riskFlags: spamAssessment.riskFlags,
      supabase,
      turnstileOutcome: turnstileResult.reason,
    });

    return NextResponse.json(
      {
        error:
          turnstileResult.status === 503
            ? "No pudimos validar la solicitud en este momento. Inténtalo de nuevo en unos minutos."
            : blockedCampaignRequestMessage,
      },
      { status: turnstileResult.status },
    );
  }

  if (spamAssessment.blockReasons.length > 0) {
    await recordCampaignRequestAuditEvent({
      blockReason: spamAssessment.blockReasons.join(","),
      campaignId: null,
      contactEmail,
      eventType: "blocked",
      requestData,
      requestMetadata,
      riskFlags: spamAssessment.riskFlags,
      supabase,
      turnstileOutcome: turnstileResult.reason,
    });

    return NextResponse.json(
      {
        error: spamAssessment.blockReasons.some((reason) =>
          /garbage|low_information/i.test(reason),
        )
          ? "La solicitud parece contener datos de prueba o información insuficiente. Revisa el título, responsable, correo, Instagram y link antes de enviarla."
          : blockedCampaignRequestMessage,
      },
      { status: 403 },
    );
  }

  const rateLimitResult = await enforceCampaignRequestRateLimits({
    contactEmail,
    requestMetadata,
    supabase,
  });

  if (rateLimitResult.blocked) {
    await recordCampaignRequestAuditEvent({
      blockReason: rateLimitResult.reason,
      campaignId: null,
      contactEmail,
      eventType: "blocked",
      requestData,
      requestMetadata,
      riskFlags: spamAssessment.riskFlags,
      supabase,
      turnstileOutcome: turnstileResult.reason,
    });

    return NextResponse.json(
      { error: blockedCampaignRequestMessage },
      { status: 429 },
    );
  }

  const blockResult = await findCampaignRequestBlock({
    contactEmail,
    requestData,
    requestMetadata,
    supabase,
  });

  if (blockResult.blocked) {
    await recordCampaignRequestAuditEvent({
      blockReason: blockResult.reason,
      campaignId: null,
      contactEmail,
      eventType: "blocked",
      requestData,
      requestMetadata,
      riskFlags: spamAssessment.riskFlags,
      supabase,
      turnstileOutcome: turnstileResult.reason,
    });

    return NextResponse.json(
      { error: blockedCampaignRequestMessage },
      { status: 403 },
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
        requestData,
        requestMetadata,
        reviewedBy:
          requestData.publishAsVerified && activeAdminProfile
            ? activeAdminProfile.user_id
            : undefined,
        siteUrl,
        spamAssessment,
        supabase,
        turnstileOutcome: turnstileResult.reason,
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
    requestData,
    requestMetadata,
    reviewedBy:
      requestData.publishAsVerified && activeAdminProfile
        ? activeAdminProfile.user_id
        : undefined,
    siteUrl,
    spamAssessment,
    supabase,
    turnstileOutcome: turnstileResult.reason,
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
  requestData,
  requestMetadata,
  reviewedBy,
  siteUrl,
  spamAssessment,
  supabase,
  turnstileOutcome,
}: {
  campaignId: string;
  requestData: z.infer<typeof campaignRequestSchema>;
  requestMetadata: RequestMetadata;
  reviewedBy?: string;
  siteUrl: string;
  spamAssessment: CampaignSpamAssessment;
  supabase: ReturnType<typeof createAdminClient>;
  turnstileOutcome: string;
}) {
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

  const publicCampaignUrl =
    publicationResult.publicCampaignUrl ??
    new URL(`/campanas/${requestData.slug}`, siteUrl).toString();
  const eventType =
    spamAssessment.riskFlags.length > 0 ? "suspicious" : "created";

  await recordCampaignRequestAuditEvent({
    campaignId,
    contactEmail: normalizeEmail(requestData.email),
    eventType,
    requestData,
    requestMetadata,
    riskFlags: spamAssessment.riskFlags,
    supabase,
    turnstileOutcome,
  });

  if (spamAssessment.riskFlags.length > 0) {
    await notifyCampaignSpamAlert({
      campaignId,
      publicCampaignUrl,
      requestData,
      riskFlags: spamAssessment.riskFlags,
      siteUrl,
      supabase,
    });
  }

  return NextResponse.json({
    ok: true,
    approvalEmailQueued: false,
    approvalEmailSent: false,
    confirmationEmailQueued: false,
    confirmationEmailSent: false,
    confirmationRecipientEmail: requestData.email,
    creatorAccessLink: publicationResult.creatorAccessUrl,
    publicCampaignUrl,
    publicationFlow: "instant",
    published: true,
    reason: null,
  });
}

async function verifyTurnstileToken({
  ip,
  isLocalRequest,
  token,
}: {
  ip: string | null;
  isLocalRequest: boolean;
  token?: string;
}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const requiresTurnstile = !isLocalRequest && Boolean(secret);

  if (!requiresTurnstile) {
    return { ok: true, reason: "skipped_dev" };
  }

  if (!secret) {
    return { ok: false, reason: "turnstile_not_configured", status: 503 };
  }

  if (!token) {
    return { ok: false, reason: "turnstile_token_missing", status: 403 };
  }

  try {
    const body = new URLSearchParams({
      response: token,
      secret,
    });

    if (ip) {
      body.set("remoteip", ip);
    }

    const response = await fetch(turnstileVerificationUrl, {
      body,
      method: "POST",
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (!response.ok || !result.success) {
      return {
        ok: false,
        reason: `turnstile_failed:${(result["error-codes"] ?? []).join("|")}`,
        status: 403,
      };
    }

    return { ok: true, reason: "verified" };
  } catch {
    return { ok: false, reason: "turnstile_unavailable", status: 503 };
  }
}

async function enforceCampaignRequestRateLimits({
  contactEmail,
  requestMetadata,
  supabase,
}: {
  contactEmail: string;
  requestMetadata: RequestMetadata;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const rateLimitSalt = getRequestHashSalt();
  const checks = [
    requestMetadata.ipHash
      ? {
          action: "campaign_create_ip",
          bucketKey: requestMetadata.ipHash,
          maxAttempts: 5,
          windowMs: 30 * 60 * 1000,
        }
      : null,
    {
      action: "campaign_create_email",
      bucketKey: createStableHash(contactEmail, rateLimitSalt),
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
    },
  ].filter(
    (check): check is {
      action: string;
      bucketKey: string;
      maxAttempts: number;
      windowMs: number;
    } => Boolean(check),
  );

  for (const check of checks) {
    const result = await recordRateLimitAttempt({ ...check, supabase });

    if (result.blocked) {
      return result;
    }
  }

  return { blocked: false };
}

async function recordRateLimitAttempt({
  action,
  bucketKey,
  maxAttempts,
  supabase,
  windowMs,
}: {
  action: string;
  bucketKey: string;
  maxAttempts: number;
  supabase: ReturnType<typeof createAdminClient>;
  windowMs: number;
}) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
    .toISOString();

  try {
    const { data } = await supabase
      .from("campaign_request_rate_limits")
      .select("attempt_count")
      .eq("action", action)
      .eq("bucket_key", bucketKey)
      .eq("window_start", windowStart)
      .maybeSingle<{ attempt_count: number }>();

    if (!data) {
      await supabase.from("campaign_request_rate_limits").insert({
        action,
        bucket_key: bucketKey,
        window_start: windowStart,
      });

      return { blocked: false };
    }

    const nextAttemptCount = data.attempt_count + 1;
    await supabase
      .from("campaign_request_rate_limits")
      .update({
        attempt_count: nextAttemptCount,
        updated_at: new Date().toISOString(),
      })
      .eq("action", action)
      .eq("bucket_key", bucketKey)
      .eq("window_start", windowStart);

    return nextAttemptCount > maxAttempts
      ? { blocked: true, reason: `rate_limited:${action}` }
      : { blocked: false };
  } catch {
    return { blocked: false };
  }
}

async function notifyCampaignSpamAlert({
  campaignId,
  publicCampaignUrl,
  requestData,
  riskFlags,
  siteUrl,
  supabase,
}: {
  campaignId: string;
  publicCampaignUrl: string;
  requestData: z.infer<typeof campaignRequestSchema>;
  riskFlags: string[];
  siteUrl: string;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const { data: admins } = await supabase
    .from("admin_profiles")
    .select("email")
    .eq("active", true)
    .returns<{ email: string }[]>();

  await Promise.all(
    (admins ?? []).map((admin) =>
      queueOrSendEmailEvent(supabase, "campaign_spam_alert", {
        adminUrl: new URL("/admin", siteUrl).toString(),
        campaignId,
        contactEmail: requestData.email,
        publicCampaignUrl,
        recipientEmail: admin.email,
        responsibleName: requestData.responsibleName,
        riskFlags,
        slug: requestData.slug,
        title: requestData.title,
      }),
    ),
  );
}

async function findCampaignRequestBlock({
  contactEmail,
  requestData,
  requestMetadata,
  supabase,
}: {
  contactEmail: string;
  requestData: z.infer<typeof campaignRequestSchema>;
  requestMetadata: RequestMetadata;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const normalizedInstagramHandle = normalizeInstagramHandle(
    requestData.instagramHandle,
  );
  const blockCandidates = [
    requestMetadata.ip
      ? { block_type: "ip", block_value: requestMetadata.ip }
      : null,
    { block_type: "email", block_value: contactEmail },
    {
      block_type: "email_domain",
      block_value: contactEmail.split("@").at(1) ?? "",
    },
    { block_type: "slug", block_value: requestData.slug },
    normalizedInstagramHandle
      ? { block_type: "instagram_handle", block_value: normalizedInstagramHandle }
      : null,
  ].filter(
    (candidate): candidate is { block_type: string; block_value: string } =>
      Boolean(candidate?.block_value),
  );

  const envBlock = findEnvironmentBlock(blockCandidates);

  if (envBlock) {
    return { blocked: true, reason: envBlock };
  }

  try {
    const { data, error } = await supabase
      .from("campaign_request_blocks")
      .select("block_type, block_value, reason")
      .eq("is_active", true)
      .in(
        "block_type",
        Array.from(new Set(blockCandidates.map((candidate) => candidate.block_type))),
      );

    if (error || !data) {
      return { blocked: false };
    }

    const matchingBlock = data.find((block) =>
      blockCandidates.some(
        (candidate) =>
          candidate.block_type === block.block_type &&
          candidate.block_value === normalizeBlockValue(block.block_value),
      ),
    );

    return matchingBlock
      ? {
          blocked: true,
          reason:
            matchingBlock.reason ??
            `${matchingBlock.block_type}:${matchingBlock.block_value}`,
        }
      : { blocked: false };
  } catch {
    return { blocked: false };
  }
}

function findEnvironmentBlock(
  blockCandidates: { block_type: string; block_value: string }[],
) {
  const envByType: Record<string, string | undefined> = {
    email: process.env.CAMPAIGN_BLOCKED_EMAILS,
    email_domain: process.env.CAMPAIGN_BLOCKED_EMAIL_DOMAINS,
    instagram_handle: process.env.CAMPAIGN_BLOCKED_INSTAGRAM_HANDLES,
    ip: process.env.CAMPAIGN_BLOCKED_IPS,
    slug: process.env.CAMPAIGN_BLOCKED_SLUGS,
  };

  for (const candidate of blockCandidates) {
    const blockedValues = parseBlockedValues(envByType[candidate.block_type]);

    if (blockedValues.has(candidate.block_value)) {
      return `env:${candidate.block_type}:${candidate.block_value}`;
    }
  }

  return null;
}

function parseBlockedValues(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map(normalizeBlockValue)
      .filter(Boolean),
  );
}

function normalizeBlockValue(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

async function recordCampaignRequestAuditEvent({
  blockReason,
  campaignId,
  contactEmail,
  eventType,
  requestData,
  requestMetadata,
  riskFlags = [],
  supabase,
  turnstileOutcome,
}: {
  blockReason?: string;
  campaignId: string | null;
  contactEmail: string;
  eventType: "blocked" | "created" | "suspicious";
  requestData: z.infer<typeof campaignRequestSchema>;
  requestMetadata: RequestMetadata;
  riskFlags?: string[];
  supabase: ReturnType<typeof createAdminClient>;
  turnstileOutcome?: string;
}) {
  try {
    await supabase.from("campaign_request_audit_events").insert({
      block_reason: blockReason ?? null,
      campaign_id: campaignId,
      contact_email: contactEmail,
      event_type: eventType,
      instagram_handle: normalizeInstagramHandle(requestData.instagramHandle),
      ip_address: requestMetadata.ip,
      ip_hash: requestMetadata.ipHash,
      rate_limit_key: requestMetadata.ipHash,
      risk_flags: riskFlags,
      slug: requestData.slug,
      turnstile_outcome: turnstileOutcome ?? null,
      user_agent: requestMetadata.userAgent,
    });
  } catch {
    // Spam controls should never prevent the core submission flow if the
    // migration has not reached the database yet.
  }
}

type RequestMetadata = {
  ip: string | null;
  ipHash: string | null;
  userAgent: string | null;
};

function getRequestMetadata(request: Request): RequestMetadata {
  const ip = getRequestIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  return {
    ip,
    ipHash: ip ? createRequestIpHash(ip) : null,
    userAgent,
  };
}

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null
  );
}

function createRequestIpHash(ip: string) {
  return createStableHash(ip, getRequestHashSalt());
}

function getRequestHashSalt() {
  return (
    process.env.CAMPAIGN_REVIEW_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "vendonar"
  );
}

function normalizeInstagramHandle(value?: string) {
  return value?.replace(/^@/, "").trim().toLowerCase() || null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

async function getRequestAdminProfile() {
  try {
    const { profile } = await getActiveAdminProfile();

    return profile;
  } catch {
    return null;
  }
}
