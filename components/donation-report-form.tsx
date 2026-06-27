"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { useState } from "react";
import type { Campaign } from "@/lib/demo-data";
import {
  buildCampaignDocumentPath,
  storageBuckets,
  uploadStorageFile,
  validateStorageFile,
} from "@/lib/storage-upload";

export function DonationReportForm({ campaign }: { campaign: Campaign }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [proofFileStatus, setProofFileStatus] = useState("");

  async function submitDonationReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const proofFile = formData.get("proof") as File | null;
    const hasProofFile = Boolean(proofFile?.name);
    let proofFilePath = "";

    try {
      if (hasProofFile && proofFile) {
        const validationError = validateStorageFile(
          proofFile,
          storageBuckets.donationProofs,
        );

        if (validationError) {
          throw new Error(validationError);
        }

        setProofFileStatus("Subiendo comprobante...");
        proofFilePath = await uploadStorageFile({
          bucket: storageBuckets.donationProofs,
          file: proofFile,
          path: buildCampaignDocumentPath({
            file: proofFile,
            kind: "proof",
            slug: campaign.slug,
          }),
        });
        setProofFileStatus("Comprobante subido.");
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "No se pudo subir el comprobante.",
      );
      return;
    }

    const response = await fetch("/api/donation-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignSlug: campaign.slug,
        donorName: formData.get("donorName"),
        donorEmail: formData.get("donorEmail"),
        isAnonymous: formData.get("isAnonymous") === "on",
        amount: formData.get("amount"),
        currency: formData.get("currency"),
        transferDate: formData.get("transferDate"),
        paymentMethodUsed: formData.get("paymentMethodUsed"),
        transferReference: formData.get("transferReference"),
        proofFilePath,
        publicMessage: formData.get("publicMessage"),
      }),
    });

    if (!response.ok) {
      const errorMessage = await readResponseError(
        response,
        "No se pudo enviar el aviso. Inténtalo de nuevo.",
      );
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    const result = await response.json();
    setStatus("sent");
    setStatusMessage(
      result.confirmationEmailSent
        ? "Reporte enviado. Te mandamos un correo de confirmación."
        : "Reporte recibido. Tu aporte quedó registrado para revisión; no pudimos enviar el correo de confirmación.",
    );
    event.currentTarget.reset();
    setProofFileStatus("");
  }

  return (
    <Card className="surface-card shadow-none">
      <form onSubmit={submitDonationReport}>
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Tu nombre (opcional)" name="donorName" />
            <TextField
              label="Correo electrónico (opcional)"
              name="donorEmail"
              type="email"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="isAnonymous" type="checkbox" />
            Donar anónimamente en la vista pública
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="Monto"
              name="amount"
              required
              step="any"
              type="number"
            />
            <TextField
              helperText="Si estás donando desde Venezuela, reporta el monto en USD o una aproximación en USD."
              label="Moneda"
              name="currency"
              placeholder="USD"
              required
            />
            <TextField label="Fecha" name="transferDate" type="date" />
          </div>
          <TextField
            label="Método usado"
            name="paymentMethodUsed"
            placeholder="Ej. Zelle, SPEI, Pago móvil, transferencia bancaria..."
          />
          <TextField
            label="Referencia / tracking number (opcional)"
            name="transferReference"
          />
          <TextField
            accept="image/png,image/jpeg,image/webp,application/pdf"
            label="Comprobante o screenshot"
            name="proof"
            statusMessage={proofFileStatus}
            type="file"
            onChange={(file) => {
              const validationError = file
                ? validateStorageFile(file, storageBuckets.donationProofs)
                : "";

              setProofFileStatus(validationError);
            }}
          />
          <TextAreaField
            label="Mensaje público (opcional)"
            name="publicMessage"
          />
          <Button
            className="w-fit !rounded-full bg-[#2D5D5E] px-5 font-black text-[#FAE880]"
            isDisabled={status === "sending"}
            type="submit"
            variant="primary"
          >
            {status === "sending" ? "Enviando..." : "Enviar reporte"}
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
            Al enviar, el aporte quedará pendiente. En el flujo conectado se
            generará un código de seguimiento y aparecerá
            públicamente solo después de revisión manual.
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
  helperText,
  label,
  name,
  placeholder,
  required = false,
  statusMessage,
  step,
  type = "text",
  onChange,
}: {
  accept?: string;
  helperText?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  statusMessage?: string;
  step?: string;
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
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        variant="secondary"
      />
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
