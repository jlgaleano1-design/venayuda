"use client";

import { Button, Card } from "@heroui/react";
import {
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { campaigns } from "@/lib/demo-data";
import {
  buildCampaignAssetPath,
  storageBuckets,
  uploadStorageFile,
  validateStorageFile,
} from "@/lib/storage-upload";

const categories = [
  ["crypto", "Cripto"],
  ["mexico", "México"],
  ["united_states", "Estados Unidos"],
  ["venezuela", "Venezuela"],
  ["spain", "España"],
  ["panama", "Panamá"],
  ["colombia", "Colombia"],
  ["chile", "Chile"],
  ["argentina", "Argentina"],
  ["international", "Otros países"],
];

const affectedZones = [
  "La Guaira / Litoral",
  "Caracas",
  "Yumare / Moron",
  "Puerto Cabello y alrededores",
  "Costa de Aragua",
  "Otros",
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
    receivingCategory: "crypto",
    methodName: "",
    accountHolder: "",
    bank: "",
    accountReference: "",
    transferInstructions: "",
  };
}

export function CreateCampaignForm() {
  const shareInputRef = useRef<HTMLInputElement>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDraft[]>([
    createEmptyPaymentMethod(1),
  ]);
  const [nextPaymentMethodId, setNextPaymentMethodId] = useState(2);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageName, setCoverImageName] = useState("");
  const [coverImageStatus, setCoverImageStatus] = useState("");
  const [shareField, setShareField] = useState("");
  const [shareFieldError, setShareFieldError] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionResult, setSubmissionResult] = useState<{
    confirmationRecipientEmail: string;
    publicCampaignUrl: string;
  } | null>(null);

  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const siteHost = siteUrl.replace(/^https?:\/\//, "");
  const shareSlug = normalizeShareField(shareField);
  const isShareFieldTaken = campaigns.some(
    (campaign) => campaign.slug === shareSlug,
  );
  const hasEmail = email.trim().length > 0;
  const isEmailValid = isValidEmail(email);
  const paymentMethodsToSubmit = paymentMethods.filter(isPaymentMethodStarted);
  const incompletePaymentMethodIndex = paymentMethods.findIndex(
    (method) => isPaymentMethodStarted(method) && !isPaymentMethodComplete(method),
  );
  const arePaymentMethodsComplete =
    paymentMethodsToSubmit.length > 0 && incompletePaymentMethodIndex === -1;
  const canSubmit =
    shareSlug.length > 0 &&
    !isShareFieldTaken &&
    !shareFieldError &&
    isEmailValid &&
    arePaymentMethodsComplete;
  const submitBlockReason = getSubmitBlockReason({
    hasLinkError: Boolean(shareFieldError),
    hasEmail,
    hasPaymentMethod: paymentMethodsToSubmit.length > 0,
    incompletePaymentMethodIndex,
    isEmailValid,
    isShareFieldTaken,
    shareSlug,
  });
  const lastPaymentMethod = paymentMethods[paymentMethods.length - 1];
  const canAddPaymentMethod =
    Boolean(lastPaymentMethod) && isPaymentMethodComplete(lastPaymentMethod);
  const publicCampaignLink = `${siteUrl}/campanas/${shareSlug || "tu-campana"}`;
  const formHelpText = shareFieldError || (!canSubmit ? submitBlockReason : "");
  const shouldFocusShareField =
    Boolean(shareFieldError) || (!shareSlug && Boolean(formHelpText));

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

  function deletePaymentMethod(id: number) {
    setPaymentMethods((currentMethods) => {
      if (currentMethods.length === 1) {
        return currentMethods;
      }

      return currentMethods.filter((method) => method.id !== id);
    });
  }

  async function submitCampaignRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !arePaymentMethodsComplete) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setShareFieldError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      let coverImagePath = "";

      if (coverImageFile) {
        setCoverImageStatus("Subiendo imagen de portada...");
        coverImagePath = await uploadStorageFile({
          bucket: storageBuckets.campaignAssets,
          file: coverImageFile,
          path: buildCampaignAssetPath(shareSlug, coverImageFile),
        });
        setCoverImageStatus("Imagen de portada subida.");
      }

      const response = await fetch("/api/campaign-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          responsibleName: String(formData.get("responsiblePersonName") ?? ""),
          organization: String(formData.get("responsibleOrganization") ?? ""),
          instagramHandle: String(formData.get("instagramHandle") ?? ""),
          email,
          affectedArea: String(formData.get("affectedArea") ?? ""),
          slug: shareSlug,
          description: String(formData.get("description") ?? ""),
          coverImageName: coverImagePath,
          paymentMethods: paymentMethodsToSubmit.map(toPaymentMethodPayload),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No pudimos enviar la solicitud.");
      }

      setSubmissionResult({
        confirmationRecipientEmail:
          typeof result.confirmationRecipientEmail === "string"
            ? result.confirmationRecipientEmail
            : email,
        publicCampaignUrl: result.publicCampaignUrl ?? publicCampaignLink,
      });
      setIsSubmitted(true);
    } catch (error) {
      const normalizedError = normalizeSubmissionError(error);

      if (isDuplicateLinkError(normalizedError)) {
        setShareFieldError(normalizedError);
        focusShareField();
      } else {
        setSubmitError(normalizedError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function focusShareField() {
    shareInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    shareInputRef.current?.focus({ preventScroll: true });
  }

  if (isSubmitted) {
    return (
      <Card className="surface-card shadow-none">
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
          <div className="flex items-start gap-4 rounded-[1.5rem] border border-[#2D5D5E]/20 bg-[#2D5D5E]/5 p-5">
            <CheckCircle2 className="mt-1 shrink-0 text-[#2D5D5E]" size={26} />
            <div>
              <h2 className="text-xl font-extrabold">Revisa tu correo</h2>
              <p className="mt-2 leading-7 text-neutral-700">
                Te enviamos un enlace al correo{" "}
                <span className="font-extrabold text-[#2A3534]">
                  {submissionResult?.confirmationRecipientEmail ?? email}
                </span>{" "}
                para confirmar y publicar esta campaña.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-neutral-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-neutral-500">
                  Link solicitado
                </p>
                <p className="mt-2 break-all font-extrabold text-[#2D5D5E]">
                  {submissionResult?.publicCampaignUrl ?? publicCampaignLink}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#2D5D5E]/10 px-3 py-1 text-xs font-extrabold text-[#2D5D5E]">
                <CheckCircle2 size={15} />
                Coincide con tu link personalizado
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Este enlace se activa cuando confirmas desde tu correo.
            </p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="surface-card shadow-none">
      <form onSubmit={submitCampaignRequest}>
        <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Título de la campaña" name="title" required />
          <TextField
            label="Persona responsable"
            name="responsiblePersonName"
            required
          />
          <TextField label="Organización (opcional)" name="responsibleOrganization" />
          <TextField label="@ de Instagram (opcional)" name="instagramHandle" />
          <EmailField
            isInvalid={hasEmail && !isEmailValid}
            value={email}
            onChange={setEmail}
          />
          <SelectField label="Zona afectada" name="affectedArea" options={affectedZones} />
        </div>
        <label className="field-label">
          Link personalizado para compartir
          <div
            className={`flex min-h-11 items-center rounded-full border bg-[#FFFCF8] px-4 text-sm ${
              isShareFieldTaken || shareFieldError
                ? "border-red-300"
                : shareSlug
                  ? "border-[#2D5D5E]"
                  : "border-neutral-300"
            }`}
          >
            <span className="shrink-0 text-neutral-500">
              {siteHost}/campanas/
            </span>
            <input
              ref={shareInputRef}
              aria-invalid={isShareFieldTaken || Boolean(shareFieldError)}
              className="min-w-0 flex-1 bg-transparent font-bold outline-none"
              placeholder="ayuda-la-guaira"
              value={shareField}
              onChange={(event) => {
                setShareFieldError("");
                setShareField(normalizeShareField(event.target.value));
              }}
            />
          </div>
          {shareSlug || shareFieldError ? (
            <span
              className={`text-xs font-bold ${
                isShareFieldTaken || shareFieldError
                  ? "text-red-700"
                  : "text-[#2D5D5E]"
              }`}
            >
              {shareFieldError ||
                (isShareFieldTaken
                ? "Ese link ya está usado. Prueba con otro nombre."
                  : "Disponible. Este será el link público de la campaña.")}
            </span>
          ) : null}
        </label>
        <TextAreaField
          className="min-h-28"
          helperText="Cuenta qué se necesita, para qué y por qué urge."
          label="Descripción / historia"
          name="description"
          required
        />
        <label className="field-label">
          Imagen de portada
          <span className="flex cursor-pointer items-center justify-between gap-3 rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-4 py-2.5 transition hover:border-[#2D5D5E] hover:bg-[#FFFCF8]">
            <span className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFFCF8] text-[#2D5D5E]">
                <ImageIcon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#2A3534]">
                  {coverImageName || "Subir imagen"}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  JPG, PNG o WebP
                </span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#2D5D5E]">
              <Upload size={15} />
              Elegir archivo
            </span>
          </span>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              const validationError = file
                ? validateStorageFile(file, storageBuckets.campaignAssets)
                : "";

              setCoverImageFile(validationError ? null : file);
              setCoverImageName(validationError ? "" : (file?.name ?? ""));
              setCoverImageStatus(validationError);
            }}
          />
          {coverImageStatus ? (
            <span
              className={`text-xs font-bold ${
                coverImageStatus.includes("no permitido")
                  ? "text-red-700"
                  : "text-[#2D5D5E]"
              }`}
            >
              {coverImageStatus}
            </span>
          ) : null}
        </label>
        <div className="border-t border-neutral-200 pt-5">
          <h2 className="font-extrabold">Métodos para recibir ayuda</h2>
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
              showRequiredErrors={
                isPaymentMethodStarted(method) && !isPaymentMethodComplete(method)
              }
              canDelete={
                paymentMethods.length > 1 && isPaymentMethodComplete(method)
              }
              onDelete={() => deletePaymentMethod(method.id)}
              onToggle={() => togglePaymentMethod(method.id)}
              onUpdate={(field, value) =>
                updatePaymentMethod(method.id, field, value)
              }
            />
          ))}
        </div>

        <Button
          className="min-h-10 w-full !justify-center !rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black text-[#2A3534] shadow-sm"
          isDisabled={!canAddPaymentMethod}
          type="button"
          variant="secondary"
          onPress={addPaymentMethod}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Plus className="shrink-0" size={15} />
            <span>Agregar otro método</span>
          </span>
        </Button>
        {!canAddPaymentMethod ? (
          <p className="text-sm font-bold text-neutral-500">
            Completa todos los campos del método actual para agregar otro.
          </p>
        ) : null}

        {submitError ? (
          <p className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {submitError}
          </p>
        ) : null}

        {formHelpText ? (
          shouldFocusShareField ? (
            <button
              className="w-fit text-left text-sm font-bold text-red-700 underline decoration-red-300 underline-offset-4"
              type="button"
              onClick={focusShareField}
            >
              {formHelpText}
            </button>
          ) : (
            <p className="text-sm font-bold text-red-700">{formHelpText}</p>
          )
        ) : null}
        <Button
          className="inline-flex min-h-14 w-fit items-center gap-2 whitespace-nowrap !rounded-full bg-[#2D5D5E] px-6 py-3 font-black text-[#FAE880]"
          isDisabled={!canSubmit || isSubmitting}
          type="submit"
          variant="primary"
        >
          <Plus className="shrink-0" size={18} />
          <span>{isSubmitting ? "Enviando..." : "Enviar solicitud"}</span>
        </Button>
        </Card.Content>
      </form>
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

function normalizeSubmissionError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "No pudimos enviar la solicitud.";

  if (/Invalid Compact JWS/i.test(message)) {
    return "No pudimos conectar con el almacenamiento de imágenes. Revisa la llave pública de Supabase o intenta enviar la solicitud sin imagen por ahora.";
  }

  return message;
}

function isDuplicateLinkError(message: string) {
  return /link personalizado.*usado|slug|duplicate/i.test(message);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPaymentMethodComplete(method: PaymentMethodDraft) {
  return [
    method.receivingCategory,
    method.accountHolder,
    method.bank,
    method.accountReference,
  ].every((value) => value.trim().length > 0);
}

function isPaymentMethodStarted(method: PaymentMethodDraft) {
  return [
    method.accountHolder,
    method.bank,
    method.accountReference,
    method.transferInstructions,
  ].some((value) => value.trim().length > 0);
}

function getSubmitBlockReason({
  hasLinkError,
  hasEmail,
  hasPaymentMethod,
  incompletePaymentMethodIndex,
  isEmailValid,
  isShareFieldTaken,
  shareSlug,
}: {
  hasLinkError: boolean;
  hasEmail: boolean;
  hasPaymentMethod: boolean;
  incompletePaymentMethodIndex: number;
  isEmailValid: boolean;
  isShareFieldTaken: boolean;
  shareSlug: string;
}) {
  if (hasLinkError) {
    return "El link personalizado ya está usado. Prueba con otro nombre.";
  }

  if (!shareSlug) {
    return "Completa el link personalizado para poder enviar la solicitud.";
  }

  if (isShareFieldTaken) {
    return "El link personalizado ya está usado. Prueba con otro nombre.";
  }

  if (!hasEmail) {
    return "Agrega un correo electrónico para recibir el seguimiento de la solicitud.";
  }

  if (!isEmailValid) {
    return "Corrige el correo electrónico para poder enviar la solicitud.";
  }

  if (!hasPaymentMethod) {
    return "Agrega al menos un método completo. Los métodos adicionales vacíos no bloquean el envío.";
  }

  if (incompletePaymentMethodIndex >= 0) {
    return `Completa los campos obligatorios del método ${incompletePaymentMethodIndex + 1} o déjalo totalmente vacío.`;
  }

  return "";
}

function toPaymentMethodPayload(method: PaymentMethodDraft) {
  return {
    receivingCategory: method.receivingCategory,
    methodName: method.bank,
    accountHolder: method.accountHolder,
    bank: method.bank,
    accountReference: method.accountReference,
    transferInstructions: method.transferInstructions,
  };
}

function PaymentMethodPanel({
  index,
  isOpen,
  isComplete,
  method,
  showRequiredErrors,
  canDelete,
  onDelete,
  onToggle,
  onUpdate,
}: {
  index: number;
  isOpen: boolean;
  isComplete: boolean;
  method: PaymentMethodDraft;
  showRequiredErrors: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onToggle: () => void;
  onUpdate: (
    field: keyof Omit<PaymentMethodDraft, "id" | "isOpen">,
    value: string,
  ) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-neutral-200">
      <div className="flex items-center gap-2 rounded-[1.5rem] bg-neutral-50 px-3 py-2">
        <Button
          aria-expanded={isOpen}
          className="flex h-auto min-h-11 flex-1 items-center justify-between gap-3 !rounded-full bg-transparent px-2 py-2 text-left font-black text-[#2A3534]"
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
        {canDelete ? (
          <button
            aria-label={`Borrar método ${index + 1}`}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
            title="Borrar método"
            type="button"
            onClick={onDelete}
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label className="field-label">
            Recibe donaciones por
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
            {method.receivingCategory === "venezuela" ? (
              <span className="text-xs font-bold leading-5 text-neutral-500">
                Para Venezuela, publica montos e instrucciones en USD o en una
                aproximación en USD.
              </span>
            ) : null}
          </label>
          <PaymentTextField
            label="Titular / destinatario"
            showError={
              showRequiredErrors && method.accountHolder.trim().length === 0
            }
            value={method.accountHolder}
            onChange={(value) => onUpdate("accountHolder", value)}
          />
          <PaymentTextField
            label="Banco, plataforma o método"
            showError={showRequiredErrors && method.bank.trim().length === 0}
            value={method.bank}
            onChange={(value) => onUpdate("bank", value)}
          />
          <PaymentTextField
            label="Cuenta, correo, wallet o ID"
            showError={
              showRequiredErrors && method.accountReference.trim().length === 0
            }
            value={method.accountReference}
            onChange={(value) => onUpdate("accountReference", value)}
          />
          <div className="md:col-span-2">
            <PaymentTextAreaField
              label="Instrucciones de transferencia (opcional)"
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
  showError,
  value,
  onChange,
}: {
  label: string;
  showError: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label">
      {label}
      <input
        aria-invalid={showError}
        className={`field ${showError ? "border-red-300 focus:border-red-600" : ""}`}
        required
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {showError ? (
        <span className="text-xs font-bold text-red-700">
          Este campo es obligatorio si usas este método.
        </span>
      ) : null}
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
        className="textarea-field-compact"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
      <input className="field" name={name} required={required} type={type} />
    </label>
  );
}

function EmailField({
  isInvalid,
  value,
  onChange,
}: {
  isInvalid: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label">
      Correo electrónico
      <input
        aria-invalid={isInvalid}
        className={`field ${isInvalid ? "border-red-300 focus:border-red-600" : ""}`}
        inputMode="email"
        placeholder="nombre@correo.com"
        required
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {isInvalid ? (
        <span className="text-xs font-bold text-red-700">
          Escribe un correo válido, por ejemplo nombre@correo.com.
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="field-label">
      {label}
      <select className="field" defaultValue={options[0]} name={name}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  className = "",
  helperText,
  label,
  name,
  required = false,
}: {
  className?: string;
  helperText?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="field-label">
      {label}
      {helperText ? (
        <span className="text-xs leading-5 text-neutral-500">{helperText}</span>
      ) : null}
      <textarea
        className={`textarea-field-compact ${className}`}
        name={name}
        required={required}
      />
    </label>
  );
}
