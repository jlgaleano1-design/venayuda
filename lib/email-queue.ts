import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CampaignApprovedEmail,
  type CampaignReviewEmail,
  type DonationConfirmationEmail,
  type DonationReportEmail,
  type PurchaseImpactEmail,
  type PurchaseReviewEmail,
  sendCampaignApprovedEmail,
  sendCampaignReviewEmail,
  sendDonationConfirmationEmail,
  sendDonationReportEmail,
  sendPurchaseImpactEmail,
  sendPurchaseReviewEmail,
} from "@/lib/mail";

export type EmailEventType =
  | "campaign_approved"
  | "campaign_review"
  | "donation_confirmation"
  | "donation_report"
  | "purchase_impact"
  | "purchase_review";

export type EmailEventPayloadMap = {
  campaign_approved: CampaignApprovedEmail;
  campaign_review: CampaignReviewEmail;
  donation_confirmation: DonationConfirmationEmail;
  donation_report: DonationReportEmail;
  purchase_impact: PurchaseImpactEmail;
  purchase_review: PurchaseReviewEmail;
};

type EmailDispatchResult = {
  queued: boolean;
  reason?: string;
  sent: boolean;
};

type EmailQueueResult = {
  eventId?: string;
  queued: boolean;
  reason?: string;
};

type EmailEventRow = {
  id: string;
  attempts: number;
  event_type: EmailEventType;
  max_attempts: number;
  payload: EmailEventPayloadMap[EmailEventType];
};

export async function enqueueEmailEvent<T extends EmailEventType>(
  supabase: SupabaseClient,
  eventType: T,
  payload: EmailEventPayloadMap[T],
): Promise<EmailQueueResult> {
  const { data, error } = await supabase
    .from("email_events")
    .insert({
      event_type: eventType,
      payload,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return {
      queued: false,
      reason: "El correo no pudo entrar a la cola de envío.",
    };
  }

  return { eventId: data?.id as string | undefined, queued: true };
}

export async function queueOrSendEmailEvent<T extends EmailEventType>(
  supabase: SupabaseClient,
  eventType: T,
  payload: EmailEventPayloadMap[T],
): Promise<EmailDispatchResult> {
  const queued = await enqueueEmailEvent(supabase, eventType, payload);
  const delivery = await sendEmailEventNow(eventType, payload);

  if (delivery.sent) {
    if (queued.eventId) {
      await supabase
        .from("email_events")
        .update({
          last_error: null,
          locked_at: null,
          sent_at: new Date().toISOString(),
          status: "sent",
        })
        .eq("id", queued.eventId);
    }

    return { queued: false, sent: true };
  }

  return {
    queued: queued.queued,
    reason:
      queued.queued && isEmailWorkerConfigured()
        ? "El correo quedó en cola de envío."
        : (queued.reason ?? delivery.reason),
    sent: false,
  };
}

export async function sendEmailEventNow<T extends EmailEventType>(
  eventType: T,
  payload: EmailEventPayloadMap[T],
) {
  try {
    const delivery = await deliverEmailEvent({
      attempts: 0,
      event_type: eventType,
      id: "direct",
      max_attempts: 1,
      payload,
    });

    if (!delivery.sent) {
      return {
        reason: delivery.reason ?? "El proveedor de email no envió.",
        sent: false,
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      reason: error instanceof Error ? error.message : "Error desconocido",
      sent: false,
    };
  }
}

export async function processEmailQueue({
  batchSize = 8,
  rateLimitDelayMs = 150,
  supabase,
}: {
  batchSize?: number;
  rateLimitDelayMs?: number;
  supabase: SupabaseClient;
}) {
  const safeBatchSize = Math.max(1, Math.min(batchSize, 8));
  const { data, error } = await supabase.rpc("claim_email_events", {
    batch_size: safeBatchSize,
  });

  if (error) {
    throw new Error(`No se pudo reclamar la cola de correos: ${error.message}`);
  }

  const events = (data ?? []) as EmailEventRow[];
  const result = {
    claimed: events.length,
    failed: 0,
    retried: 0,
    sent: 0,
  };

  for (const [index, event] of events.entries()) {
    try {
      const delivery = await deliverEmailEvent(event);

      if (!delivery.sent) {
        throw new Error(delivery.reason ?? "El proveedor de email no envió.");
      }

      await supabase
        .from("email_events")
        .update({
          last_error: null,
          locked_at: null,
          sent_at: new Date().toISOString(),
          status: "sent",
        })
        .eq("id", event.id);
      result.sent += 1;
    } catch (error) {
      const finalAttempt = event.attempts >= event.max_attempts;
      const lastError =
        error instanceof Error ? error.message : "Error desconocido";

      await supabase
        .from("email_events")
        .update({
          last_error: lastError,
          locked_at: null,
          scheduled_at: finalAttempt
            ? null
            : new Date(Date.now() + backoffMs(event.attempts)).toISOString(),
          status: finalAttempt ? "failed" : "retrying",
        })
        .eq("id", event.id);

      if (finalAttempt) {
        result.failed += 1;
      } else {
        result.retried += 1;
      }
    }

    if (index < events.length - 1) {
      await wait(rateLimitDelayMs);
    }
  }

  return result;
}

async function deliverEmailEvent(event: EmailEventRow) {
  switch (event.event_type) {
    case "campaign_approved":
      return sendCampaignApprovedEmail(
        event.payload as EmailEventPayloadMap["campaign_approved"],
      );
    case "campaign_review":
      return sendCampaignReviewEmail(
        event.payload as EmailEventPayloadMap["campaign_review"],
      );
    case "donation_confirmation":
      return sendDonationConfirmationEmail(
        event.payload as EmailEventPayloadMap["donation_confirmation"],
      );
    case "donation_report":
      return sendDonationReportEmail(
        event.payload as EmailEventPayloadMap["donation_report"],
      );
    case "purchase_impact":
      return sendPurchaseImpactEmail(
        event.payload as EmailEventPayloadMap["purchase_impact"],
      );
    case "purchase_review":
      return sendPurchaseReviewEmail(
        event.payload as EmailEventPayloadMap["purchase_review"],
      );
  }
}

function backoffMs(attempts: number) {
  const seconds = Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1));

  return seconds * 1000;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEmailWorkerConfigured() {
  return Boolean(process.env.EMAIL_WORKER_SECRET || process.env.CRON_SECRET);
}
