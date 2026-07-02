import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "TARGET_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CAMPAIGN_REVIEW_SECRET",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  fail(`Faltan variables: ${missingEnv.join(", ")}`);
}

const siteUrl = normalizeUrl(process.env.TARGET_SITE_URL);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerSecret = process.env.EMAIL_WORKER_SECRET ?? process.env.CRON_SECRET;
const qaEmailDomain = process.env.QA_EMAIL_DOMAIN ?? "example.com";

if (workerSecret && isReservedEmailDomain(qaEmailDomain)) {
  fail(
    "QA_EMAIL_DOMAIN debe ser un dominio real/controlado cuando EMAIL_WORKER_SECRET o CRON_SECRET estan configurados.",
  );
}

const anonSupabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});
const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const runId = Date.now().toString(36);
const slug = `e2e-${runId}`;
const donorEmail = `donante+${runId}@${qaEmailDomain}`;
const creatorEmail = `creador+${runId}@${qaEmailDomain}`;
const pngFile = new Blob([tinyPng()], { type: "image/png" });

const context = {
  campaignId: "",
  creatorAccessToken: "",
  donationId: "",
  proofPath: "",
  purchaseId: randomUUID(),
  slug,
};

await step("Smoke público", async () => {
  await expectOk(fetchUrl("/"), "home pública");
  await expectOk(fetchUrl("/campanas/crear"), "crear campaña");
  await expectOk(fetchUrl("/admin/login"), "login admin");

  const adminResponse = await fetchUrl("/admin", { redirect: "manual" });
  assert(
    [200, 302, 303, 307, 308].includes(adminResponse.status),
    `/admin respondió ${adminResponse.status}`,
  );
});

await step("Crear campaña sintética con imagen real en Storage", async () => {
  const coverPath = `requests/${slug}/${Date.now()}-cover.png`;
  await uploadAnonFile("campaign-assets", coverPath, pngFile);

  const response = await postJson("/api/campaign-requests", {
    affectedArea: "Prueba E2E staging",
    coverImageName: coverPath,
    description:
      "Campaña sintética para validar el flujo completo antes de publicar.",
    email: creatorEmail,
    instagramHandle: "vendonar_test",
    organization: "Equipo Vendonar QA",
    paymentMethods: [
      {
        accountHolder: "Vendonar QA",
        accountReference: "qa@example.com",
        bank: "Banco de pruebas",
        methodName: "Transferencia QA",
        receivingCategory: "international",
        transferInstructions: "No enviar dinero real. Prueba sintética.",
      },
    ],
    responsibleName: "Responsable QA",
    slug,
    title: `Campaña E2E ${runId}`,
  });

  const body = await response.json();
  assert(response.ok, `crear campaña falló: ${JSON.stringify(body)}`);

  const { data: campaign } = await adminSupabase
    .from("campaigns")
    .select("id, status, verification_status")
    .eq("slug", slug)
    .single();

  assert(campaign?.status === "active", "campaña no quedó active");
  assert(
    campaign?.verification_status === "pending",
    "campaña no quedó pendiente de verificación",
  );
  context.campaignId = campaign.id;

  const { data: event } = await adminSupabase
    .from("email_events")
    .select("payload")
    .eq("event_type", "campaign_approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const creatorAccessUrl = event?.payload?.creatorAccessUrl;
  assert(creatorAccessUrl, "no se encoló email de campaña aprobada con link creador");
  context.creatorAccessToken = new URL(creatorAccessUrl).pathname.split("/").pop();
  assert(context.creatorAccessToken, "no se pudo leer token de creador");

  const creatorPortalHtml = await text(fetchUrl(`/creador/${context.creatorAccessToken}`));
  assert(
    creatorPortalHtml.includes("Portal del creador"),
    "link creador recién enviado no abrió el portal",
  );
});

await step("Validar render público ocultando campaña sintética", async () => {
  const homeHtml = await text(fetchUrl("/"));
  const detailHtml = await text(fetchUrl(`/campanas/${slug}`));
  assert(!homeHtml.includes(`Campaña E2E ${runId}`), "home muestra la campaña sintética");
  assert(detailHtml.includes(`Campaña E2E ${runId}`), "detalle no muestra la campaña aprobada");
  assert(!detailHtml.toLowerCase().includes("placeholder"), "detalle contiene texto placeholder");
});

await step("Reportar y aprobar donación con comprobante", async () => {
  const proofPath = `${slug}/proof/${Date.now()}-proof.png`;
  await uploadAnonFile("donation-proofs", proofPath, pngFile);
  context.proofPath = proofPath;

  const response = await postJson("/api/donation-reports", {
    amount: "25",
    amountUsdEstimated: "25",
    campaignSlug: slug,
    currency: "USD",
    donorEmail,
    donorName: "Donante QA",
    isAnonymous: false,
    paymentMethodUsed: "Transferencia QA",
    proofFilePath: proofPath,
    publicMessage: "Donación sintética E2E.",
    transferDate: new Date().toISOString().slice(0, 10),
    transferReference: `QA-${runId}`,
  });
  const body = await response.json();
  assert(response.ok, `reportar donación falló: ${JSON.stringify(body)}`);
  assert(
    body.confirmationEmailQueued === true,
    "correo de agradecimiento al donante no quedó en cola",
  );

  const { data: donation } = await adminSupabase
    .from("donations")
    .select("id, status, proof_file_path")
    .eq("public_code", body.publicCode)
    .single();
  assert(donation?.status === "pending", "donación no quedó pending");
  assert(donation?.proof_file_path === proofPath, "comprobante no guardó path real");
  context.donationId = donation.id;

  const token = createReviewToken("donation", context.donationId);
  const approveResponse = await fetchUrl(
    `/api/donation-reports/${context.donationId}/review?token=${token}&decision=approve`,
    { redirect: "manual" },
  );
  assert([200, 302, 303].includes(approveResponse.status), "aprobación de donación falló");

  const { data: verifiedDonation } = await adminSupabase
    .from("donations")
    .select("status, amount_usd_estimated")
    .eq("id", context.donationId)
    .single();
  assert(verifiedDonation?.status === "verified", "donación no quedó verified");
  assert(
    Number(verifiedDonation?.amount_usd_estimated) === 25,
    "donación USD no actualizó amount_usd_estimated",
  );

  const confirmationEvent = await findEmailEvent(
    "donation_confirmation",
    (payload) =>
      payload.recipientEmail === donorEmail &&
      payload.campaignUrl?.includes(`/campanas/${slug}`),
  );
  assert(
    confirmationEvent,
    "no se encontró correo de agradecimiento en cola para el donante de esta prueba",
  );
});

await step("Reportar y aprobar donación con conversión USD automática", async () => {
  const response = await postJson("/api/donation-reports", {
    amount: "500",
    campaignSlug: slug,
    currency: "USD",
    donorName: "Donante MXN QA",
    isAnonymous: false,
    paymentMethodUsed: "Transferencia QA",
    publicMessage: "Donación MXN sintética E2E.",
    transferDate: new Date().toISOString().slice(0, 10),
    transferReference: `QA-MXN-${runId}`,
  });
  const body = await response.json();
  assert(response.ok, `reportar donación MXN falló: ${JSON.stringify(body)}`);

  const { data: donation } = await adminSupabase
    .from("donations")
    .select("id, amount_original, amount_usd_estimated, currency_original, status")
    .eq("public_code", body.publicCode)
    .single();
  assert(donation?.status === "pending", "donación USD no quedó pending");
  assert(donation?.currency_original === "USD", "donación USD no guardó moneda original");
  assert(Number(donation?.amount_original) === 500, "donación USD no guardó monto original");
  assert(Number(donation?.amount_usd_estimated) === 500, "donación USD no generó estimado USD");

  const token = createReviewToken("donation", donation.id);
  const approveResponse = await fetchUrl(
    `/api/donation-reports/${donation.id}/review?token=${token}&decision=approve`,
    { redirect: "manual" },
  );
  assert([200, 302, 303].includes(approveResponse.status), "aprobación de donación MXN falló");
});

await step("Subir compra y validar publicación directa", async () => {
  const photoPath = `${context.purchaseId}/photo/${Date.now()}-photo.png`;
  const invoicePath = `${context.purchaseId}/invoice/${Date.now()}-invoice.png`;
  await uploadAnonFile("purchase-documents", photoPath, pngFile);
  await uploadAnonFile("purchase-documents", invoicePath, pngFile);

  const response = await postJson("/api/creator-updates", {
    accessCode: context.creatorAccessToken,
    amount: "18",
    campaignSlug: slug,
    currency: "USD",
    description: "Compra sintética para validar seguimiento a donantes.",
    invoiceFilePath: invoicePath,
    photoFilePath: photoPath,
    purchaseId: context.purchaseId,
    title: `Compra E2E ${runId}`,
    vendor: "Proveedor QA",
  });
  const body = await response.json();
  assert(response.ok, `subir compra falló: ${JSON.stringify(body)}`);
  assert(
    body.impactEmailsQueued >= 1,
    "la actualización no encoló notificación para donantes verificados",
  );

  const { data: purchase } = await adminSupabase
    .from("purchases")
    .select("id, status, amount_usd_estimated, is_photo_public, photo_file_path, invoice_file_path")
    .eq("id", context.purchaseId)
    .single();
  assert(purchase?.status === "approved", "compra no quedó approved");
  assert(
    Number(purchase?.amount_usd_estimated) === 18,
    "compra no generó amount_usd_estimated",
  );
  assert(purchase?.is_photo_public === true, "foto no quedó pública");
  assert(purchase?.photo_file_path === photoPath, "foto no guardó path real");
  assert(purchase?.invoice_file_path === invoicePath, "factura no guardó path real");

  const detailHtml = await text(fetchUrl(`/campanas/${slug}`));
  assert(detailHtml.includes(`Compra E2E ${runId}`), "detalle no muestra la compra aprobada");

  const { data: impactEvent } = await adminSupabase
    .from("email_events")
    .select("id")
    .eq("event_type", "purchase_impact")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assert(impactEvent?.id, "no se encoló correo de impacto al donante");

  const donorImpactEvent = await findEmailEvent(
    "purchase_impact",
    (payload) =>
      payload.recipientEmail === donorEmail &&
      payload.purchaseTitle === `Compra E2E ${runId}` &&
      payload.campaignUrl?.includes(`/campanas/${slug}`),
  );
  assert(
    donorImpactEvent,
    "no se encontró notificación de update en cola para el donante de esta prueba",
  );
});

await step("Validar privacidad básica", async () => {
  const { data: anonDonations, error: donationReadError } = await anonSupabase
    .from("donations")
    .select("id")
    .eq("id", context.donationId)
    .limit(1);
  assert(
    donationReadError || (anonDonations ?? []).length === 0,
    "anon pudo leer tabla donations",
  );

  const { error: proofDownloadError } = await anonSupabase.storage
    .from("donation-proofs")
    .download(context.proofPath);
  assert(proofDownloadError, "anon pudo descargar comprobante privado");

  const invalidCreatorResponse = await fetchUrl("/creador/token-invalido-e2e");
  assert(
    [403, 404].includes(invalidCreatorResponse.status) || invalidCreatorResponse.ok,
    `link creador inválido respondió ${invalidCreatorResponse.status}`,
  );
  const invalidCreatorHtml = await invalidCreatorResponse.text();
  assert(
    invalidCreatorHtml.includes("no tiene acceso") ||
      invalidCreatorHtml.includes("No encontramos"),
    "link creador inválido no mostró bloqueo esperado",
  );
});

await step("Procesar cola de correos", async () => {
  if (!workerSecret) {
    warn("EMAIL_WORKER_SECRET/CRON_SECRET no configurado; se omite worker.");
    return;
  }

  for (let index = 0; index < 3; index += 1) {
    const response = await fetchUrl("/api/internal/email-worker", {
      headers: { authorization: `Bearer ${workerSecret}` },
      method: "GET",
    });
    const body = await response.json();
    assert(response.ok, `worker falló: ${JSON.stringify(body)}`);
  }

  const { data: events } = await adminSupabase
    .from("email_events")
    .select("status")
    .in("event_type", [
      "campaign_approved",
      "campaign_review",
      "donation_confirmation",
      "donation_report",
      "purchase_impact",
      "purchase_review",
    ]);
  const counts = countBy(events ?? [], "status");
  log(`Estados email_events: ${JSON.stringify(counts)}`);
});

log(`E2E staging OK para slug ${slug}`);

function createReviewToken(type, id) {
  const payload = {
    exp: Date.now() + 1000 * 60 * 60,
    id,
    type,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.CAMPAIGN_REVIEW_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

async function postJson(path, payload) {
  return fetchUrl(path, {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function uploadAnonFile(bucket, path, file) {
  const { error } = await anonSupabase.storage.from(bucket).upload(path, file, {
    cacheControl: "60",
    contentType: "image/png",
    upsert: false,
  });

  assert(!error, `Storage upload ${bucket}/${path} falló: ${error?.message}`);
}

async function findEmailEvent(eventType, predicate) {
  const { data, error } = await adminSupabase
    .from("email_events")
    .select("id, payload, status")
    .eq("event_type", eventType)
    .order("created_at", { ascending: false })
    .limit(20);

  assert(!error, `no se pudo leer email_events ${eventType}: ${error?.message}`);

  return (data ?? []).find((event) => predicate(event.payload));
}

async function expectOk(responsePromise, label) {
  const response = await responsePromise;
  assert(response.ok, `${label} respondió ${response.status}`);
  return response;
}

async function text(responsePromise) {
  const response = await responsePromise;
  assert(response.ok, `GET ${response.url} respondió ${response.status}`);
  return response.text();
}

function fetchUrl(path, init) {
  return fetch(new URL(path, siteUrl), init);
}

async function step(label, callback) {
  process.stdout.write(`\n- ${label}... `);
  await callback();
  process.stdout.write("OK\n");
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function log(message) {
  console.log(message);
}

function normalizeUrl(value) {
  return value.replace(/\/+$/g, "");
}

function isReservedEmailDomain(domain) {
  const normalized = domain.toLowerCase();

  return (
    normalized === "example.com" ||
    normalized === "example.net" ||
    normalized === "example.org" ||
    normalized === "test" ||
    normalized.endsWith(".test") ||
    normalized === "invalid" ||
    normalized.endsWith(".invalid") ||
    normalized === "localhost"
  );
}

function countBy(rows, key) {
  return rows.reduce((summary, row) => {
    summary[row[key]] = (summary[row[key]] ?? 0) + 1;
    return summary;
  }, {});
}

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}
