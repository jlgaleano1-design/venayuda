"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { FileField } from "@/components/file-field";
import type { Campaign } from "@/lib/demo-data";
import { getCampaignText, getDictionary, type Locale } from "@/lib/i18n";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";
import {
  buildCampaignDocumentPath,
  storageBuckets,
  uploadStorageFile,
  validateStorageFile,
} from "@/lib/storage-upload";

export function DonationReportForm({
  campaign,
  framed = true,
  locale = "es",
}: {
  campaign: Campaign;
  framed?: boolean;
  locale?: Locale;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [proofFileStatus, setProofFileStatus] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const t = getDictionary(locale).donationReport;
  const campaignText = getCampaignText({
    description: campaign.description,
    descriptionEn: campaign.descriptionEn,
    locale,
    slug: campaign.slug,
    title: campaign.title,
    titleEn: campaign.titleEn,
  });

  const publicCampaignPath = getPublicCampaignPath(campaign.slug, locale);
  const publicCampaignUrl =
    typeof window === "undefined"
      ? publicCampaignPath
      : new URL(publicCampaignPath, window.location.origin).toString();

  async function shareCampaign() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaignText.title,
          text: t.shareText(campaignText.title),
          url: publicCampaignUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicCampaignUrl);
      }

      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      setShareCopied(false);
    }
  }

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

        setProofFileStatus(t.uploadStatus);
        proofFilePath = await uploadStorageFile({
          bucket: storageBuckets.donationProofs,
          file: proofFile,
          path: buildCampaignDocumentPath({
            file: proofFile,
            kind: "proof",
            slug: campaign.slug,
          }),
        });
        setProofFileStatus(t.uploadDone);
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t.uploadError,
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
        currency: "USD",
        paymentMethodUsed: formData.get("paymentMethodUsed"),
        transferReference: formData.get("transferReference"),
        proofFilePath,
        publicMessage: formData.get("publicMessage"),
      }),
    });

    if (!response.ok) {
      const errorMessage = await readResponseError(
        response,
        t.submitError,
      );
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    const result = await response.json();
    setStatus("sent");
    setStatusMessage(
      result.confirmationEmailSent
        ? t.sentWithEmail
        : t.sentWithoutEmail,
    );
    event.currentTarget.reset();
    setProofFileName("");
    setProofFileStatus("");
  }

  if (status === "sent") {
    const thankYouScreen = (
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="overflow-hidden rounded-[1.75rem] bg-[#E8F2ED]">
          {campaign.coverImageUrl ? (
            <div
              aria-label={getDictionary(locale).campaignDetail.coverAlt(
                campaignText.title,
              )}
              className="aspect-[16/10] bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${campaign.coverImageUrl})` }}
            />
          ) : (
            <div className="aspect-[16/10]" />
          )}
        </div>

        <div className="space-y-3">
          <span className="soft-pill">{t.sentPill}</span>
          <h3 className="text-2xl font-black leading-tight tracking-normal">
            {t.thankYouTitle(campaignText.title)}
          </h3>
          <p className="text-sm leading-6 text-neutral-700">
            {t.thankYouBody}
          </p>
        </div>

        <button
          className="btn-primary w-full justify-center"
          type="button"
          onClick={shareCampaign}
        >
          {shareCopied ? <Check size={18} /> : <Share2 size={18} />}
          {shareCopied ? t.copied : t.shareCampaign}
        </button>

        <p className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
          {t.reviewNotice}
        </p>
      </div>
    );

    if (!framed) {
      return thankYouScreen;
    }

    return (
      <Card className="surface-card shadow-none">
        <Card.Content>{thankYouScreen}</Card.Content>
      </Card>
    );
  }

  const form = (
    <form onSubmit={submitDonationReport}>
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label={t.donorName} name="donorName" />
          <TextField
            label={t.donorEmail}
            name="donorEmail"
            type="email"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="isAnonymous" type="checkbox" />
          {t.anonymous}
        </label>
        <TextField
          label={t.amount}
          name="amount"
          prefix="USD"
          required
          step="any"
          type="number"
        />
        <TextField
          label={t.paymentMethod}
          name="paymentMethodUsed"
          placeholder={t.paymentMethodPlaceholder}
        />
        <TextField
          label={t.transferReference}
          name="transferReference"
        />
        <FileField
          accept="image/png,image/jpeg,image/webp,application/pdf"
          label={t.proof}
          name="proof"
          selectLabel={t.selectFile}
          statusMessage={proofFileStatus || proofFileName}
          onChange={(file) => {
            const validationError = file
              ? validateStorageFile(file, storageBuckets.donationProofs)
              : "";

            setProofFileName(validationError ? "" : (file?.name ?? ""));
            setProofFileStatus(validationError);
          }}
        />
        <TextAreaField label={t.publicMessage} name="publicMessage" />
        <Button
          className="min-h-14 w-fit !rounded-full bg-[#2D5D5E] px-6 py-3 font-black text-[#FAE880]"
          isDisabled={status === "sending"}
          type="submit"
          variant="primary"
        >
          {status === "sending" ? t.sending : t.submit}
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
          {t.manualReviewNote}
        </div>
      </div>
    </form>
  );

  if (!framed) {
    return form;
  }

  return (
    <Card className="surface-card shadow-none">
      <Card.Content>{form}</Card.Content>
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
