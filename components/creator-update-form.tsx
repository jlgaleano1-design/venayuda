"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { ExternalLink, Plus, RotateCcw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileField } from "@/components/file-field";
import type { Campaign } from "@/lib/demo-data";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";
import {
  buildPurchaseDocumentPath,
  storageBuckets,
  uploadStorageFile,
  validateStorageFile,
} from "@/lib/storage-upload";

type CreatorUpdateCampaign = Pick<Campaign, "slug"> & {
  creatorAccessCode?: string;
};

export function CreatorUpdateForm({
  campaign,
  endpoint = "/api/creator-updates",
  statusSuccessMessage = "Novedad publicada en tu campaña.",
}: {
  campaign: CreatorUpdateCampaign & { id?: string };
  endpoint?: string;
  statusSuccessMessage?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [photoName, setPhotoName] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const publicCampaignPath = getPublicCampaignPath(campaign.slug);
  const publicCampaignUrl =
    typeof window === "undefined"
      ? publicCampaignPath
      : new URL(publicCampaignPath, window.location.origin).toString();

  async function shareCampaign() {
    setShareStatus("");

    try {
      if (navigator.share) {
        await navigator.share({
          text: "Mira esta campaña en Vendonar.",
          title: "Campaña en Vendonar",
          url: publicCampaignUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(publicCampaignUrl);
      setShareStatus("Link copiado.");
    } catch {
      setShareStatus("No pudimos compartir el link.");
    }
  }

  async function submitUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const photo = formData.get("photo") as File | null;
    const invoice = formData.get("invoice") as File | null;
    const hasInvoice = Boolean(invoice?.name);
    const purchaseId = crypto.randomUUID();
    const uploadTimestamp = Date.now();
    let photoFilePath = "";
    let invoiceFilePath = "";

    try {
      const photoValidationError = validateStorageFile(
        photo,
        storageBuckets.purchaseDocuments,
      );

      if (photoValidationError) {
        throw new Error(photoValidationError);
      }

      setPhotoStatus("Subiendo foto...");
      photoFilePath = await uploadStorageFile({
        bucket: storageBuckets.purchaseDocuments,
        file: photo as File,
        path: buildPurchaseDocumentPath({
          file: photo as File,
          kind: "photo",
          purchaseId,
          timestamp: uploadTimestamp,
        }),
      });
      setPhotoStatus("Foto subida.");

      if (hasInvoice && invoice) {
        const invoiceValidationError = validateStorageFile(
          invoice,
          storageBuckets.purchaseDocuments,
        );

        if (invoiceValidationError) {
          throw new Error(invoiceValidationError);
        }

        setInvoiceStatus("Subiendo factura...");
        invoiceFilePath = await uploadStorageFile({
          bucket: storageBuckets.purchaseDocuments,
          file: invoice,
          path: buildPurchaseDocumentPath({
            file: invoice,
            kind: "invoice",
            purchaseId,
            timestamp: uploadTimestamp,
          }),
        });
        setInvoiceStatus("Factura subida.");
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo subir el archivo.",
      );
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        campaignSlug: campaign.slug,
        accessCode: campaign.creatorAccessCode,
        title: formData.get("title"),
        description: formData.get("description"),
        amount: formData.get("amount"),
        currency: "USD",
        vendor: formData.get("vendor"),
        purchaseId,
        photoFilePath,
        invoiceFilePath,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = await readResponseError(
        result,
        "No se pudo enviar la novedad. Inténtalo de nuevo.",
      );
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    setStatus("sent");
    setPhotoName("");
    setPhotoStatus("");
    setInvoiceStatus("");
    setStatusMessage(
      getSuccessMessage({
        fallback: statusSuccessMessage,
        impactEmailsQueued:
          typeof result?.impactEmailsQueued === "number"
            ? result.impactEmailsQueued
            : undefined,
        impactEmailsSent:
          typeof result?.impactEmailsSent === "number"
            ? result.impactEmailsSent
            : undefined,
      }),
    );
    event.currentTarget.reset();
    router.refresh();
  }

  if (status === "sent") {
    return (
      <Card className="surface-card shadow-none">
        <Card.Content className="flex min-h-[420px] flex-col justify-center gap-6 p-6 md:p-8">
          <div className="space-y-4">
            <span className="soft-pill w-fit">Actualización publicada</span>
            <h2 className="text-3xl font-black tracking-normal md:text-4xl">
              Uso de fondos publicado
            </h2>
            <div className="max-w-2xl space-y-4 text-base leading-7 text-neutral-700">
              <p>
                Gracias por reportarlo. Ya publicamos esta actualización en la
                campaña y avisamos por correo a los donantes verificados.
              </p>
              <p>
                Esto ayuda a que las personas que donaron puedan ver cómo se
                está usando la ayuda.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a className="btn-primary" href={publicCampaignPath}>
              Ver campaña
              <ExternalLink size={18} />
            </a>
            <Button
              className="btn-secondary"
              type="button"
              variant="secondary"
              onPress={() => {
                setStatus("idle");
                setStatusMessage("");
                setShareStatus("");
              }}
            >
              <RotateCcw size={18} />
              Reportar otro uso de fondos
            </Button>
            <Button
              className="btn-secondary"
              type="button"
              variant="secondary"
              onPress={shareCampaign}
            >
              <Share2 size={18} />
              Compartir campaña
            </Button>
          </div>

          {shareStatus ? (
            <p className="text-sm font-bold text-[#2D5D5E]">{shareStatus}</p>
          ) : null}
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="surface-card shadow-none">
      <form onSubmit={submitUpdate}>
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Qué compraste" name="title" required />
            <TextField label="Proveedor / tienda" name="vendor" />
            <TextField
              label="Monto gastado en dólares (opcional)"
              name="amount"
              prefix="USD"
              step="any"
              type="number"
            />
          </div>

          <FileField
            accept="image/png,image/jpeg,image/webp"
            label="Foto"
            name="photo"
            required
            statusMessage={photoStatus || photoName}
            onChange={(file) => {
              const validationError = file
                ? validateStorageFile(file, storageBuckets.purchaseDocuments)
                : "";

              setPhotoName(validationError ? "" : (file?.name ?? ""));
              setPhotoStatus(validationError);
            }}
          />

          <FileField
            accept="image/png,image/jpeg,image/webp,application/pdf"
            label="Factura o ticket (opcional)"
            name="invoice"
            statusMessage={invoiceStatus}
            onChange={(file) => {
              const validationError = file
                ? validateStorageFile(file, storageBuckets.purchaseDocuments)
                : "";

              setInvoiceStatus(validationError);
            }}
          />
          <TextAreaField label="Descripción breve (opcional)" name="description" />

          <Button
            className="inline-flex min-h-14 w-fit items-center gap-2 whitespace-nowrap !rounded-full bg-[#2D5D5E] px-6 py-3 font-black text-[#FAE880]"
            isDisabled={status === "sending"}
            type="submit"
            variant="primary"
          >
            <Plus className="shrink-0" size={18} />
            <span>{status === "sending" ? "Enviando..." : "Enviar novedad"}</span>
          </Button>

          {statusMessage ? (
            <p
              className={
                status === "error"
                  ? "text-sm font-bold text-red-700"
                  : "text-sm font-bold text-[#2D5D5E]"
              }
            >
              {statusMessage}
            </p>
          ) : null}

        </Card.Content>
      </form>
    </Card>
  );
}

function getSuccessMessage({
  fallback,
  impactEmailsQueued,
  impactEmailsSent,
}: {
  fallback: string;
  impactEmailsQueued?: number;
  impactEmailsSent?: number;
}) {
  if (
    typeof impactEmailsQueued !== "number" &&
    typeof impactEmailsSent !== "number"
  ) {
    return fallback;
  }

  const sent = impactEmailsSent ?? 0;
  const queued = impactEmailsQueued ?? 0;

  if (sent > 0 && queued > 0) {
    return `Uso de fondos publicado. ${sent} ${
      sent === 1 ? "correo fue enviado" : "correos fueron enviados"
    } y ${queued} ${queued === 1 ? "quedó" : "quedaron"} en cola.`;
  }

  if (sent > 0) {
    return `Uso de fondos publicado. ${sent} ${
      sent === 1 ? "correo fue enviado" : "correos fueron enviados"
    } a donantes verificados.`;
  }

  if (queued === 0) {
    return "Uso de fondos publicado. No había donantes verificados con correo para avisar.";
  }

  return `Uso de fondos publicado. ${queued} ${
    queued === 1 ? "correo quedó" : "correos quedaron"
  } en cola de envío.`;
}

function readResponseError(result: unknown, fallback: string) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return fallback;
}

function TextField({
  helperText,
  label,
  name,
  placeholder,
  prefix,
  required = false,
  step,
  type = "text",
}: {
  helperText?: string;
  label: string;
  name: string;
  placeholder?: string;
  prefix?: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  return (
    <label className="field-label">
      {label}
      {prefix ? (
        <span className="flex min-h-11 items-center overflow-hidden rounded-full border border-neutral-200 bg-white focus-within:border-[#2D5D5E]">
          <span className="flex min-h-11 items-center border-r border-neutral-200 bg-neutral-50 px-4 text-sm font-black text-[#2D5D5E]">
            {prefix}
          </span>
          <Input
            className="field !border-0 !bg-transparent"
            name={name}
            placeholder={placeholder}
            required={required}
            step={step}
            type={type}
            variant="secondary"
          />
        </span>
      ) : (
        <Input
          className="field"
          name={name}
          placeholder={placeholder}
          required={required}
          step={step}
          type={type}
          variant="secondary"
        />
      )}
      {helperText ? (
        <span className="text-xs font-bold leading-5 text-neutral-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({ label, name }: { label: string; name: string }) {
  return (
    <label className="field-label">
      {label}
      <TextArea className="textarea-field" name={name} variant="secondary" />
    </label>
  );
}
