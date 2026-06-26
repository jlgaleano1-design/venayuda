"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  Plus,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { campaigns } from "@/lib/demo-data";

const categories = [
  ["mexico", "México"],
  ["united_states", "Estados Unidos"],
  ["venezuela", "Venezuela"],
  ["international", "Internacional / otro"],
];

type PaymentMethodDraft = {
  id: number;
  isOpen: boolean;
  receivingCategory: string;
  methodName: string;
  accountHolder: string;
  bank: string;
  accountReference: string;
  transferInstructions: string;
};

function createEmptyPaymentMethod(id: number): PaymentMethodDraft {
  return {
    id,
    isOpen: true,
    receivingCategory: "mexico",
    methodName: "",
    accountHolder: "",
    bank: "",
    accountReference: "",
    transferInstructions: "",
  };
}

export function CreateCampaignForm() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDraft[]>([
    createEmptyPaymentMethod(1),
  ]);
  const [nextPaymentMethodId, setNextPaymentMethodId] = useState(2);
  const [coverImageName, setCoverImageName] = useState("");
  const [shareField, setShareField] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const demoCreatorLink = "/creador/creador-med-valencia";
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const siteHost = siteUrl.replace(/^https?:\/\//, "");
  const shareSlug = normalizeShareField(shareField);
  const isShareFieldTaken = campaigns.some(
    (campaign) => campaign.slug === shareSlug,
  );
  const canSubmit = shareSlug.length > 0 && !isShareFieldTaken;
  const lastPaymentMethod = paymentMethods[paymentMethods.length - 1];
  const canAddPaymentMethod =
    Boolean(lastPaymentMethod) && isPaymentMethodComplete(lastPaymentMethod);
  const arePaymentMethodsComplete = paymentMethods.every(isPaymentMethodComplete);
  const publicCampaignLink = `${siteUrl}/${shareSlug || "tu-campana"}`;

  function addPaymentMethod() {
    if (!canAddPaymentMethod) {
      return;
    }

    setPaymentMethods((currentMethods) => [
      ...currentMethods.map((method) => ({ ...method, isOpen: false })),
      createEmptyPaymentMethod(nextPaymentMethodId),
    ]);
    setNextPaymentMethodId((currentId) => currentId + 1);
  }

  function togglePaymentMethod(id: number) {
    setPaymentMethods((currentMethods) =>
      currentMethods.map((method) =>
        method.id === id ? { ...method, isOpen: !method.isOpen } : method,
      ),
    );
  }

  function updatePaymentMethod(
    id: number,
    field: keyof Omit<PaymentMethodDraft, "id" | "isOpen">,
    value: string,
  ) {
    setPaymentMethods((currentMethods) =>
      currentMethods.map((method) =>
        method.id === id ? { ...method, [field]: value } : method,
      ),
    );
  }

  function submitCampaignRequest() {
    if (!canSubmit || !arePaymentMethodsComplete) {
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <Card className="surface-card shadow-none">
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="flex items-start gap-4 rounded-[1.5rem] border border-[#2D5D5E]/20 bg-[#2D5D5E]/5 p-5">
            <CheckCircle2 className="mt-1 shrink-0 text-[#2D5D5E]" size={26} />
            <div>
              <h2 className="text-xl font-extrabold">Solicitud recibida</h2>
              <p className="mt-2 leading-7 text-neutral-700">
                Después de la revisión, el equipo envía a la persona responsable
                un enlace privado para subir novedades de compras con foto. En
                esta demo puedes abrirlo de una vez.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-neutral-200 p-4">
            <p className="text-sm font-bold text-neutral-500">
              Link público para compartir
            </p>
            <p className="mt-2 break-all font-extrabold">
              {publicCampaignLink}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Este es el campo personalizado de la campaña. Es público, corto y
              fácil de mandar por WhatsApp, Instagram o correo.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-neutral-200 p-4">
            <p className="text-sm font-bold text-neutral-500">
              Enlace privado del creador
            </p>
            <p className="mt-2 break-all font-extrabold">
              {demoCreatorLink}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Este enlace no aparece públicamente. Permite reportar compras y
              adjuntar fotos; todo queda pendiente de aprobación.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a className="btn-primary" href={demoCreatorLink}>
              Abrir portal del creador
              <ExternalLink size={16} />
            </a>
            <Button
              className="btn-secondary"
              type="button"
              variant="secondary"
              onPress={() => setIsSubmitted(false)}
            >
              Crear otra solicitud
            </Button>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="surface-card shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Título de la campaña" />
          <TextField label="Persona responsable" />
          <TextField label="Organización (opcional)" />
          <TextField label="@ de Instagram (opcional)" />
          <TextField label="Correo electrónico" type="email" />
          <TextField label="Número de WhatsApp" type="tel" />
          <TextField label="Zona afectada" />
        </div>
        <label className="field-label">
          Link personalizado para compartir
          <div
            className={`flex min-h-11 items-center rounded-full border bg-white px-4 text-sm ${
              isShareFieldTaken
                ? "border-red-300"
                : shareSlug
                  ? "border-[#2D5D5E]"
                  : "border-neutral-300"
            }`}
          >
            <span className="shrink-0 text-neutral-500">{siteHost}/</span>
            <input
              aria-invalid={isShareFieldTaken}
              className="min-w-0 flex-1 bg-transparent font-bold outline-none"
              placeholder="medicinas-valencia"
              value={shareField}
              onChange={(event) =>
                setShareField(normalizeShareField(event.target.value))
              }
            />
          </div>
          {shareSlug ? (
            <span
              className={`text-xs font-bold ${
                isShareFieldTaken ? "text-red-700" : "text-[#2D5D5E]"
              }`}
            >
              {isShareFieldTaken
                ? "Ese link ya está usado. Prueba con otro nombre."
                : "Disponible. Este será el link público de la campaña."}
            </span>
          ) : (
            <span className="text-xs leading-5 text-neutral-500">
              Usa letras, números y guiones. Por ejemplo: alimentos-maracay.
            </span>
          )}
        </label>
        <TextAreaField label="Descripción / historia" />
        <label className="field-label">
          Imagen de portada
          <span className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-center transition hover:border-[#2D5D5E] hover:bg-white">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#2D5D5E]">
              <ImageIcon size={20} />
            </span>
            <span className="text-sm font-black text-black">
              {coverImageName || "Subir imagen de la campaña"}
            </span>
            <span className="text-xs leading-5 text-neutral-500">
              JPG, PNG o WebP. Idealmente una foto horizontal y clara.
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-[#2D5D5E]">
              <Upload size={16} />
              Elegir archivo
            </span>
          </span>
          <Input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            type="file"
            variant="secondary"
            onChange={(event) =>
              setCoverImageName(event.target.files?.[0]?.name ?? "")
            }
          />
        </label>
        <div className="border-t border-neutral-200 pt-5">
          <h2 className="font-extrabold">Métodos de recepción de pago</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Usa instrucciones abiertas. No forzamos campos bancarios por país
            porque cada caso es distinto.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {paymentMethods.map((method, index) => (
            <PaymentMethodPanel
              key={method.id}
              index={index}
              isOpen={method.isOpen}
              isComplete={isPaymentMethodComplete(method)}
              method={method}
              onToggle={() => togglePaymentMethod(method.id)}
              onUpdate={(field, value) =>
                updatePaymentMethod(method.id, field, value)
              }
            />
          ))}
        </div>

        <Button
          className="min-h-14 w-full !justify-center !rounded-full bg-neutral-100 px-6 py-3 font-black text-black"
          isDisabled={!canAddPaymentMethod}
          type="button"
          variant="secondary"
          onPress={addPaymentMethod}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="shrink-0" size={18} />
            <span>Agregar otro método de pago</span>
          </span>
        </Button>
        {!canAddPaymentMethod ? (
          <p className="text-sm font-bold text-neutral-500">
            Completa todos los campos del método actual para agregar otro.
          </p>
        ) : null}

        <Button
          className="inline-flex min-h-14 w-fit items-center gap-2 whitespace-nowrap !rounded-full bg-[#2D5D5E] px-6 py-3 font-black text-[#FAE880]"
          isDisabled={!canSubmit || !arePaymentMethodsComplete}
          type="button"
          variant="primary"
          onPress={submitCampaignRequest}
        >
          <Plus className="shrink-0" size={18} />
          <span>Enviar solicitud</span>
        </Button>
      </Card.Content>
    </Card>
  );
}

function normalizeShareField(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

function isPaymentMethodComplete(method: PaymentMethodDraft) {
  return [
    method.receivingCategory,
    method.methodName,
    method.accountHolder,
    method.bank,
    method.accountReference,
    method.transferInstructions,
  ].every((value) => value.trim().length > 0);
}

function PaymentMethodPanel({
  index,
  isOpen,
  isComplete,
  method,
  onToggle,
  onUpdate,
}: {
  index: number;
  isOpen: boolean;
  isComplete: boolean;
  method: PaymentMethodDraft;
  onToggle: () => void;
  onUpdate: (
    field: keyof Omit<PaymentMethodDraft, "id" | "isOpen">,
    value: string,
  ) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-neutral-200">
      <Button
        aria-expanded={isOpen}
        className="flex h-auto w-full items-center justify-between gap-3 !rounded-[1.5rem] bg-neutral-50 px-4 py-3 text-left font-black text-black"
        type="button"
        variant="secondary"
        onPress={onToggle}
      >
        <span className="inline-flex items-center gap-2">
          <span>Método {index + 1}</span>
          <span
            className={`inline-flex size-6 items-center justify-center rounded-full ${
              isComplete
                ? "bg-[#2D5D5E] text-[#FAE880]"
                : "bg-neutral-200 text-neutral-500"
            }`}
            title={isComplete ? "Método listo" : "Método incompleto"}
          >
            <CheckCircle2 size={15} />
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
          size={18}
        />
      </Button>

      {isOpen ? (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label className="field-label">
            Dona desde
            <select
              className="field"
              required
              value={method.receivingCategory}
              onChange={(event) =>
                onUpdate("receivingCategory", event.target.value)
              }
            >
              {categories.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <PaymentTextField
            label="Método (SPEI, Zelle, Pago móvil...)"
            value={method.methodName}
            onChange={(value) => onUpdate("methodName", value)}
          />
          <PaymentTextField
            label="Titular / destinatario"
            value={method.accountHolder}
            onChange={(value) => onUpdate("accountHolder", value)}
          />
          <PaymentTextField
            label="Banco"
            value={method.bank}
            onChange={(value) => onUpdate("bank", value)}
          />
          <PaymentTextField
            label="Número de cuenta / correo"
            value={method.accountReference}
            onChange={(value) => onUpdate("accountReference", value)}
          />
          <div className="md:col-span-2">
            <PaymentTextAreaField
              label="Instrucciones de transferencia"
              value={method.transferInstructions}
              onChange={(value) => onUpdate("transferInstructions", value)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PaymentTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label">
      {label}
      <input
        className="field"
        required
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PaymentTextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label">
      {label}
      <textarea
        className="textarea-field"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextField({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="field-label">
      {label}
      <Input className="field" type={type} variant="secondary" />
    </label>
  );
}

function TextAreaField({ label }: { label: string }) {
  return (
    <label className="field-label">
      {label}
      <TextArea className="textarea-field" variant="secondary" />
    </label>
  );
}
