import { createHmac } from "node:crypto";
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerSecret = process.env.EMAIL_WORKER_SECRET ?? process.env.CRON_SECRET;
const qaEmailDomain = process.env.QA_EMAIL_DOMAIN ?? "example.com";

if (workerSecret && isReservedEmailDomain(qaEmailDomain)) {
  fail(
    "QA_EMAIL_DOMAIN debe ser un dominio real/controlado cuando EMAIL_WORKER_SECRET o CRON_SECRET estan configurados.",
  );
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const runId = Date.now().toString(36);
const stressCampaignSlug =
  process.env.STRESS_CAMPAIGN_SLUG || `stress-base-${runId}`;

const results = {
  campaignRequests: [],
  donationReports: [],
  pageLoads: [],
};

await step("Preparar campaña activa para stress de donaciones", async () => {
  if (process.env.STRESS_CAMPAIGN_SLUG) {
    const { data: existing } = await adminSupabase
      .from("campaigns")
      .select("id, status")
      .eq("slug", stressCampaignSlug)
      .single();
    assert(existing?.status === "active", "STRESS_CAMPAIGN_SLUG no está active");
    return;
  }

  const response = await postJson("/api/campaign-requests", {
    affectedArea: "Stress staging",
    description: "Campaña sintética base para stress test.",
    email: `stress-base+${runId}@${qaEmailDomain}`,
    organization: "Vendonar QA",
    paymentMethods: [
      {
        accountHolder: "Vendonar QA",
        accountReference: "qa@example.com",
        bank: "Banco de pruebas",
        methodName: "Transferencia QA",
        receivingCategory: "international",
        transferInstructions: "No enviar dinero real.",
      },
    ],
    responsibleName: "Responsable Stress",
    slug: stressCampaignSlug,
    title: `Stress base ${runId}`,
  });
  const body = await response.json();
  assert(response.ok, `crear campaña base falló: ${JSON.stringify(body)}`);

  const { data: campaign } = await adminSupabase
    .from("campaigns")
    .select("id")
    .eq("slug", stressCampaignSlug)
    .single();
  const token = createReviewToken("campaign", campaign.id);
  const approveResponse = await fetchUrl(
    `/api/campaign-requests/${campaign.id}/review?token=${token}&decision=approve`,
    { redirect: "manual" },
  );
  assert([200, 302, 303].includes(approveResponse.status), "no se pudo aprobar campaña base");
});

await step("Enviar 50 solicitudes de campaña sintéticas", async () => {
  const tasks = Array.from({ length: 50 }, (_, index) => async () => {
    const slug = `stress-campaign-${runId}-${index}`;
    const response = await postJson("/api/campaign-requests", {
      affectedArea: "Stress staging",
      description: `Solicitud sintética stress ${index}.`,
      email: `stress-campaign-${runId}-${index}@${qaEmailDomain}`,
      organization: "Vendonar QA",
      paymentMethods: [
        {
          accountHolder: "Vendonar QA",
          accountReference: "qa@example.com",
          bank: "Banco de pruebas",
          methodName: "Transferencia QA",
          receivingCategory: "international",
          transferInstructions: "No enviar dinero real.",
        },
      ],
      responsibleName: `Responsable Stress ${index}`,
      slug,
      title: `Stress campaign ${runId}-${index}`,
    });
    results.campaignRequests.push(response.status);
  });

  await runLimited(tasks, 8);
  assertNoServerErrors(results.campaignRequests, "solicitudes de campaña");
});

await step("Enviar 100 reportes de donación sintéticos", async () => {
  const tasks = Array.from({ length: 100 }, (_, index) => async () => {
    const response = await postJson("/api/donation-reports", {
      amount: String(10 + (index % 7)),
      amountUsdEstimated: String(10 + (index % 7)),
      campaignSlug: stressCampaignSlug,
      currency: "USD",
      donorEmail: `stress-donor-${runId}-${index}@${qaEmailDomain}`,
      donorName: `Donante Stress ${index}`,
      isAnonymous: false,
      paymentMethodUsed: "Transferencia QA",
      publicMessage: `Reporte stress ${index}`,
      transferDate: new Date().toISOString().slice(0, 10),
      transferReference: `STRESS-${runId}-${index}`,
    });
    results.donationReports.push(response.status);
  });

  await runLimited(tasks, 10);
  assertNoServerErrors(results.donationReports, "reportes de donación");
});

await step("Cargar 100 veces home/detalle", async () => {
  const tasks = Array.from({ length: 100 }, (_, index) => async () => {
    const path = index % 2 === 0 ? "/" : `/campanas/${stressCampaignSlug}`;
    const response = await fetchUrl(path);
    results.pageLoads.push(response.status);
  });

  await runLimited(tasks, 12);
  assertNoServerErrors(results.pageLoads, "cargas públicas");
});

await step("Revisar cola de correos", async () => {
  if (workerSecret) {
    for (let index = 0; index < 3; index += 1) {
      const response = await fetchUrl("/api/internal/email-worker", {
        headers: { authorization: `Bearer ${workerSecret}` },
        method: "GET",
      });
      assert(response.ok, `worker respondió ${response.status}`);
    }
  } else {
    console.warn("WARN: no hay EMAIL_WORKER_SECRET/CRON_SECRET; no se procesó worker.");
  }

  const { data: emailEvents, error } = await adminSupabase
    .from("email_events")
    .select("status")
    .gte("created_at", new Date(Date.now() - 1000 * 60 * 20).toISOString());

  assert(!error, `no se pudo leer email_events: ${error?.message}`);
  console.log(`Estados email_events recientes: ${JSON.stringify(countBy(emailEvents ?? [], "status"))}`);
});

console.log(
  JSON.stringify(
    {
      campaignRequests: countStatuses(results.campaignRequests),
      donationReports: countStatuses(results.donationReports),
      pageLoads: countStatuses(results.pageLoads),
      runId,
      stressCampaignSlug,
    },
    null,
    2,
  ),
);
console.log("Stress staging OK");

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

function fetchUrl(path, init) {
  return fetch(new URL(path, siteUrl), init);
}

async function step(label, callback) {
  process.stdout.write(`\n- ${label}... `);
  await callback();
  process.stdout.write("OK\n");
}

async function runLimited(tasks, concurrency) {
  const queue = [...tasks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      await task();
    }
  });

  await Promise.all(workers);
}

function assertNoServerErrors(statuses, label) {
  const serverErrors = statuses.filter((status) => status >= 500);
  assert(serverErrors.length === 0, `${label} tuvo ${serverErrors.length} respuestas 5xx`);
}

function countStatuses(statuses) {
  return statuses.reduce((summary, status) => {
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});
}

function countBy(rows, key) {
  return rows.reduce((summary, row) => {
    summary[row[key]] = (summary[row[key]] ?? 0) + 1;
    return summary;
  }, {});
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
