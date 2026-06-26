"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { Camera, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import type { Campaign } from "@/lib/demo-data";

export function CreatorUpdateForm({ campaign }: { campaign: Campaign }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [photoName, setPhotoName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function submitUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const photo = formData.get("photo") as File | null;
    const invoice = formData.get("invoice") as File | null;

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
        photoFileName: photo?.name,
        invoiceFileName: invoice?.name,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      setStatusMessage("No se pudo enviar la novedad. Inténtalo de nuevo.");
      return;
    }

    setStatus("sent");
    setPhotoName("");
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
            <span className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-center transition hover:border-[#2D5D5E] hover:bg-white">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#2D5D5E]">
                <Camera size={20} />
              </span>
              <span className="text-sm font-black text-black">
                {photoName || "Subir foto clara de lo comprado"}
              </span>
              <span className="text-xs leading-5 text-neutral-500">
                La foto ayuda a que donantes vean en qué se convirtió el aporte.
              </span>
            </span>
            <Input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              name="photo"
              required
              type="file"
              variant="secondary"
              onChange={(event) =>
                setPhotoName(event.target.files?.[0]?.name ?? "")
              }
            />
          </label>

          <TextField
            label="Factura, ticket o captura adicional"
            name="invoice"
            type="file"
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

function TextField({
  label,
  name,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
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
