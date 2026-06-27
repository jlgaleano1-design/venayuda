"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { Camera, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import type { Campaign } from "@/lib/demo-data";
import {
  buildPurchaseDocumentPath,
  storageBuckets,
  uploadStorageFile,
  validateStorageFile,
} from "@/lib/storage-upload";

type CreatorUpdateCampaign = Pick<Campaign, "creatorAccessCode" | "slug" | "title">;

export function CreatorUpdateForm({
  campaign,
}: {
  campaign: CreatorUpdateCampaign;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [photoName, setPhotoName] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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

    const response = await fetch("/api/creator-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignSlug: campaign.slug,
        accessCode: campaign.creatorAccessCode,
        title: formData.get("title"),
        description: formData.get("description"),
        amount: formData.get("amount"),
        currency: formData.get("currency"),
        purchaseDate: formData.get("purchaseDate"),
        vendor: formData.get("vendor"),
        purchaseId,
        photoFilePath,
        invoiceFilePath,
      }),
    });

    if (!response.ok) {
      const errorMessage = await readResponseError(
        response,
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
      "Novedad recibida. Quedará pendiente hasta que el equipo la revise y apruebe.",
    );
    event.currentTarget.reset();
  }

  return (
    <Card className="surface-card shadow-none">
      <form onSubmit={submitUpdate}>
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="rounded-[1.5rem] border border-[#2D5D5E]/20 bg-[#2D5D5E]/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-[#2D5D5E]" size={20} />
              <div>
                <p className="font-black">Acceso de creador activo</p>
                <p className="mt-1 text-sm leading-6 text-neutral-700">
                  Este enlace permite subir compras y fotos para{" "}
                  <span className="font-bold">{campaign.title}</span>. Las
                  novedades no se publican hasta pasar por revisión.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Qué compraste" name="title" required />
            <TextField label="Proveedor / tienda" name="vendor" />
            <TextField label="Monto" name="amount" required type="number" />
            <TextField label="Moneda" name="currency" required />
            <TextField
              label="Fecha de compra"
              name="purchaseDate"
              required
              type="date"
            />
          </div>

          <label className="field-label">
            Foto de la compra
            <span className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-center transition hover:border-[#2D5D5E] hover:bg-[#FFFCF8]">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#FFFCF8] text-[#2D5D5E]">
                <Camera size={20} />
              </span>
              <span className="text-sm font-black text-[#121515]">
                {photoName || "Subir foto clara de lo comprado"}
              </span>
              <span className="text-xs leading-5 text-neutral-500">
                La foto ayuda a que donantes vean en qué se convirtió el aporte.
              </span>
            </span>
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              name="photo"
              required
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                const validationError = file
                  ? validateStorageFile(file, storageBuckets.purchaseDocuments)
                  : "";

                setPhotoName(validationError ? "" : (file?.name ?? ""));
                setPhotoStatus(validationError);
              }}
            />
            {photoStatus ? (
              <span
                className={`text-xs font-bold ${
                  photoStatus.includes("no permitido")
                    ? "text-red-700"
                    : "text-[#2D5D5E]"
                }`}
              >
                {photoStatus}
              </span>
            ) : null}
          </label>

          <TextField
            accept="image/png,image/jpeg,image/webp,application/pdf"
            label="Factura, ticket o captura adicional"
            name="invoice"
            statusMessage={invoiceStatus}
            type="file"
            onChange={(file) => {
              const validationError = file
                ? validateStorageFile(file, storageBuckets.purchaseDocuments)
                : "";

              setInvoiceStatus(validationError);
            }}
          />
          <TextAreaField label="Descripción breve" name="description" />

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

          <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
            En la versión conectada, esta novedad crea una compra pendiente con
            foto privada. Un admin decide si aprueba la compra y si la foto se
            muestra públicamente.
          </div>
        </Card.Content>
      </form>
    </Card>
  );
}

async function readResponseError(response: Response, fallback: string) {
  try {
    const result = await response.json();
    return typeof result.error === "string" ? result.error : fallback;
  } catch {
    return fallback;
  }
}

function TextField({
  accept,
  label,
  name,
  required = false,
  statusMessage,
  type = "text",
  onChange,
}: {
  accept?: string;
  label: string;
  name: string;
  required?: boolean;
  statusMessage?: string;
  type?: string;
  onChange?: (file: File | null) => void;
}) {
  if (type === "file") {
    return (
      <label className="field-label">
        {label}
        <input
          accept={accept}
          className="field"
          name={name}
          type="file"
          onChange={(event) => onChange?.(event.target.files?.[0] ?? null)}
        />
        {statusMessage ? (
          <span
            className={`text-xs font-bold ${
              statusMessage.includes("no permitido")
                ? "text-red-700"
                : "text-[#2D5D5E]"
            }`}
          >
            {statusMessage}
          </span>
        ) : null}
      </label>
    );
  }

  return (
    <label className="field-label">
      {label}
      <Input
        className="field"
        name={name}
        required={required}
        type={type}
        variant="secondary"
      />
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
