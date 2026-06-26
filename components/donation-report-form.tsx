"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { useState } from "react";
import type { Campaign } from "@/lib/demo-data";

export function DonationReportForm({ campaign }: { campaign: Campaign }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");

  async function submitDonationReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const proofFile = formData.get("proof") as File | null;

    const response = await fetch("/api/donation-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignSlug: campaign.slug,
        donorName: formData.get("donorName"),
        donorEmail: formData.get("donorEmail"),
        amount: formData.get("amount"),
        currency: formData.get("currency"),
        transferDate: formData.get("transferDate"),
        paymentMethodUsed: formData.get("paymentMethodUsed"),
        transferReference: formData.get("transferReference"),
        proofFileName: proofFile?.name,
        publicMessage: formData.get("publicMessage"),
      }),
    });

    if (!response.ok) {
      setStatus("error");
      setStatusMessage("No se pudo enviar el aviso. Inténtalo de nuevo.");
      return;
    }

    const result = await response.json();
    setStatus("sent");
    setStatusMessage(
      result.confirmationEmailSent
        ? "Reporte enviado. Te mandamos un correo de confirmación."
        : "Reporte registrado. Falta configurar SMTP para enviar los correos reales.",
    );
    event.currentTarget.reset();
  }

  return (
    <Card className="surface-card shadow-none">
      <form onSubmit={submitDonationReport}>
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Tu nombre (opcional)" name="donorName" />
            <TextField
              label="Correo electrónico"
              name="donorEmail"
              required
              type="email"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" />
            Donar anónimamente en la vista pública
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField label="Monto" name="amount" required type="number" />
            <TextField label="Moneda" name="currency" required />
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
          <TextField label="Comprobante o screenshot" name="proof" type="file" />
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
            generará un código como{" "}
            <span className="font-bold">DON-8F42K</span> y aparecerá
            públicamente solo después de revisión manual.
          </div>
        </Card.Content>
      </form>
    </Card>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="field-label">
      {label}
      <Input
        className="field"
        name={name}
        placeholder={placeholder}
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
