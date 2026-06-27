"use client";

import { createClient } from "@/lib/supabase/client";

export const storageBuckets = {
  campaignAssets: "campaign-assets",
  donationProofs: "donation-proofs",
  purchaseDocuments: "purchase-documents",
} as const;

type StorageBucket = (typeof storageBuckets)[keyof typeof storageBuckets];

const allowedMimeTypes: Record<StorageBucket, readonly string[]> = {
  "campaign-assets": ["image/png", "image/jpeg", "image/webp"],
  "donation-proofs": [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ],
  "purchase-documents": [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
  ],
};

const mimeTypeLabels: Record<StorageBucket, string> = {
  "campaign-assets": "JPG, PNG o WebP",
  "donation-proofs": "JPG, PNG, WebP o PDF",
  "purchase-documents": "JPG, PNG, WebP o PDF",
};

export function validateStorageFile(file: File | null, bucket: StorageBucket) {
  if (!file || file.size === 0) {
    return "Elige un archivo para subir.";
  }

  if (!allowedMimeTypes[bucket].includes(file.type)) {
    return `Formato no permitido. Usa ${mimeTypeLabels[bucket]}.`;
  }

  return "";
}

export async function uploadStorageFile({
  bucket,
  file,
  path,
}: {
  bucket: StorageBucket;
  file: File;
  path: string;
}) {
  const validationError = validateStorageFile(file, bucket);

  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "No pudimos subir el archivo.");
  }

  return data.path;
}

export function buildCampaignAssetPath(
  slug: string,
  file: File,
  timestamp = Date.now(),
) {
  return `requests/${slug}/${timestamp}-${sanitizeFileName(file.name)}`;
}

export function buildCampaignDocumentPath({
  file,
  kind,
  slug,
  timestamp = Date.now(),
}: {
  file: File;
  kind?: "photo" | "invoice" | "proof";
  slug: string;
  timestamp?: number;
}) {
  const segments = [slug, kind, `${timestamp}-${sanitizeFileName(file.name)}`];

  return segments.filter(Boolean).join("/");
}

export function buildPurchaseDocumentPath({
  file,
  kind,
  purchaseId,
  timestamp = Date.now(),
}: {
  file: File;
  kind: "photo" | "invoice";
  purchaseId: string;
  timestamp?: number;
}) {
  return `${purchaseId}/${kind}/${timestamp}-${sanitizeFileName(file.name)}`;
}

function sanitizeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const baseName = parts.join(".") || "archivo";
  const safeBaseName = baseName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeExtension = extension
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);

  return safeExtension
    ? `${safeBaseName || "archivo"}.${safeExtension}`
    : safeBaseName || "archivo";
}
