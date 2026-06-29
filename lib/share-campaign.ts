import type { Locale } from "@/lib/i18n";

export type ShareCampaignData = {
  title: string;
  responsible: string;
  affectedArea: string;
  coverImageUrl?: string;
  slug?: string;
  publicUrl?: string;
};

export function getCampaignPublicUrl(campaign: ShareCampaignData) {
  const configuredUrl = campaign.publicUrl?.trim();

  if (configuredUrl) {
    if (/^https?:\/\//i.test(configuredUrl)) {
      return configuredUrl;
    }

    if (configuredUrl.startsWith("/")) {
      const origin =
        typeof window === "undefined"
          ? process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org"
          : window.location.origin;

      return new URL(configuredUrl, origin).toString();
    }

    return `https://${configuredUrl.replace(/^\/+/, "")}`;
  }

  if (!campaign.slug) {
    return undefined;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org")
    .trim()
    .replace(/\/+$/, "");

  return `${siteUrl}/venezuela/${campaign.slug}`;
}

export function getCampaignShortUrl(campaign: ShareCampaignData) {
  const publicUrl = getCampaignPublicUrl(campaign);

  if (!publicUrl) {
    return undefined;
  }

  try {
    const url = new URL(publicUrl);
    const path = url.pathname.replace(/^\/+/, "");

    return path ? `${url.host}/${path.split("/").pop()}` : url.host;
  } catch {
    return publicUrl.replace(/^https?:\/\//i, "");
  }
}

export function createShareFilename(campaign: ShareCampaignData) {
  const safeSlug = (campaign.slug ?? campaign.title)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `vendonar-${safeSlug || "campana"}-story.jpg`;
}

export function getShareCopy(locale: Locale = "es") {
  return locale === "en" ? englishShareCopy : spanishShareCopy;
}

export function generateShareMessage({
  campaign,
  includeUrl = false,
  locale = "es",
}: {
  campaign: ShareCampaignData;
  includeUrl?: boolean;
  locale?: Locale;
}) {
  const copy = getShareCopy(locale);
  const affectedZone = campaign.affectedArea?.trim() || copy.fallbackZone;
  const publicUrl = getCampaignPublicUrl(campaign);
  const linkLine = includeUrl && publicUrl ? `\n\n${publicUrl}` : "";

  return `${copy.messageIntro}

${copy.messageBody(affectedZone)}

${copy.messageClose}${linkLine}`;
}

const spanishShareCopy = {
  assetSaved: "Imagen guardada",
  campaignLabel: "Campaña",
  close: "Cerrar",
  copied: "Link copiado",
  copyLink: "Copiar enlace",
  email: "Email",
  error: "No pudimos completar la acción.",
  fallbackZone: "Venezuela",
  facebook: "Facebook",
  generating: "Generando imagen...",
  intro:
    "Puedes compartir el link o guardar una imagen lista para subir a tus redes.",
  messageBody: (affectedZone: string) =>
    `Busca apoyar a personas afectadas en ${affectedZone}, por el terremoto. Vendonar no procesa pagos ni cobra comisiones, es ayuda directa, persona a persona.`,
  messageClose: "Puedes ayudar desde el enlace o compartiendo la campaña.",
  messageIntro: "Hola! Te comparto esta campaña de Vendonar.",
  more: "Compartir",
  saveImage: "Guardar imagen",
  shareCampaign: "Comparte esta campaña",
  story: "Story",
  storyHeadline: "Ayuda directa,\nsin intermediarios",
  storySubheadline:
    "Apoya a quienes están atendiendo las zonas más afectadas por el terremoto en Venezuela.",
  text: "Texto",
  visibleHelp: "Ayuda a que más personas lo vean",
  whatsapp: "WhatsApp",
  yourLink: "Tu enlace",
};

const englishShareCopy = {
  assetSaved: "Image saved",
  campaignLabel: "Campaign",
  close: "Close",
  copied: "Link copied",
  copyLink: "Copy link",
  email: "Email",
  error: "We could not complete this action.",
  fallbackZone: "Venezuela",
  facebook: "Facebook",
  generating: "Generating image...",
  intro: "You can share the link or save an image ready for your social posts.",
  messageBody: (affectedZone: string) =>
    `It helps support people affected in ${affectedZone} by the earthquake. Vendonar does not process payments or charge fees; it is direct, person-to-person aid.`,
  messageClose: "You can help from the link or by sharing the campaign.",
  messageIntro: "Hi! I'm sharing this Vendonar campaign with you.",
  more: "Share",
  saveImage: "Save image",
  shareCampaign: "Share this campaign",
  story: "Story",
  storyHeadline: "Direct aid,\nno middlemen",
  storySubheadline:
    "Support people helping the areas most affected by the earthquake in Venezuela.",
  text: "Text",
  visibleHelp: "Help more people see it",
  whatsapp: "WhatsApp",
  yourLink: "Your link",
};
