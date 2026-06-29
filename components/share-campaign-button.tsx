"use client";

import {
  Check,
  Copy,
  Download,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Share2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";
import {
  createShareFilename,
  generateShareMessage,
  getCampaignPublicUrl,
  getCampaignShortUrl,
  getShareCopy,
  type ShareCampaignData,
} from "@/lib/share-campaign";

type Feedback = "link" | "asset" | "error" | null;
type BusyState = "story" | null;

const colors = {
  cream: "#FFFADE",
  dark: "#063127",
  text: "#13271B",
  yellow: "#FEE761",
  yellowText: "#FDDD5F",
};

export function ShareCampaignButton({
  campaign,
  className = "",
  locale = "es",
  variant = "primary",
}: {
  campaign: ShareCampaignData;
  className?: string;
  locale?: Locale;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const buttonClassName = variant === "secondary" ? "btn-secondary" : "btn-primary";

  return (
    <>
      <button
        className={`${buttonClassName} ${className}`}
        type="button"
        onClick={() => setOpen(true)}
      >
        <Share2 size={18} />
        {getShareCopy(locale).more}
      </button>
      {open && mounted
        ? createPortal(
            <ShareCampaignDialog
              campaign={campaign}
              locale={locale}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function ShareCampaignDialog({
  campaign,
  locale,
  onClose,
}: {
  campaign: ShareCampaignData;
  locale: Locale;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const copy = getShareCopy(locale);
  const publicUrl = getCampaignPublicUrl(campaign);
  const shortUrl = getCampaignShortUrl(campaign);
  const shareMessage = generateShareMessage({ campaign, locale });
  const shareMessageWithUrl = generateShareMessage({
    campaign,
    includeUrl: true,
    locale,
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 2200);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function copyLink() {
    if (!publicUrl) {
      setFeedback("error");
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    setFeedback("link");
  }

  async function nativeShare() {
    if (!publicUrl) {
      setFeedback("error");
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: campaign.title,
        text: shareMessage,
        url: publicUrl,
      });
      return;
    }

    await copyLink();
  }

  async function downloadStory() {
    try {
      setBusy("story");
      await document.fonts.ready;
      const canvas = await createStoryCanvas(campaign, locale);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.94);
      downloadBlob(blob, createShareFilename(campaign));
      setFeedback("asset");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(null);
    }
  }

  function openShareUrl(kind: "facebook" | "whatsapp" | "x" | "email") {
    if (!publicUrl) {
      setFeedback("error");
      return;
    }

    const encodedUrl = encodeURIComponent(publicUrl);
    const text = encodeURIComponent(shareMessage);
    const textWithUrl = encodeURIComponent(shareMessageWithUrl);
    const urls = {
      email: `mailto:?subject=${encodeURIComponent(campaign.title)}&body=${textWithUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${textWithUrl}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    };

    window.open(urls[kind], "_blank", "noopener,noreferrer");
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[9998] flex items-end bg-[#121515]/45 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4 sm:py-6"
      role="dialog"
    >
      <button
        aria-label={copy.close}
        className="absolute inset-0 size-full cursor-default"
        type="button"
        onClick={onClose}
      />
      <section className="relative z-[9999] max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-[#FFFCF8] px-5 pb-6 pt-5 shadow-[0_-18px_60px_rgb(42_53_52/20%)] sm:w-[min(720px,calc(100vw-48px))] sm:rounded-[2rem] sm:p-6 sm:shadow-[0_24px_80px_rgb(42_53_52/22%)]">
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-normal text-[#2A3534] sm:text-3xl">
            {copy.shareCampaign}
          </h2>
          <button
            aria-label={copy.close}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-[#2A3534] hover:bg-neutral-200"
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {publicUrl ? (
          <div className="mt-5 grid min-h-16 grid-cols-[1fr_auto] overflow-hidden rounded-[1.25rem] border border-neutral-200 bg-white">
            <div className="min-w-0 px-4 py-3">
              <p className="text-xs font-bold text-neutral-500">
                {copy.yourLink}
              </p>
              <p className="truncate text-base font-black text-[#2A3534] sm:text-lg">
                {shortUrl ?? publicUrl}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 border-l border-neutral-200 px-4 text-sm font-black text-[#2A3534] hover:bg-neutral-50 sm:px-5 sm:text-base"
              type="button"
              onClick={copyLink}
            >
              <Copy size={18} />
              {copy.copyLink}
            </button>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-200 pt-5">
          <h3 className="text-xl font-black leading-tight text-[#2A3534]">
            {copy.visibleHelp}
          </h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{copy.intro}</p>
        </div>

        <article className="mt-5 flex items-center gap-3 rounded-[1.25rem] border border-neutral-200 bg-white p-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#2E524D]">
            {campaign.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={campaign.coverImageUrl}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#2D5D5E]">
              {copy.campaignLabel}
            </p>
            <h4 className="truncate text-base font-black leading-tight text-[#2A3534]">
              {campaign.title}
            </h4>
            <p className="mt-1 truncate text-xs font-semibold text-neutral-600">
              {campaign.affectedArea}
            </p>
          </div>
        </article>

        <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-5">
          <ShareOption
            icon={<FacebookGlyph />}
            label={copy.facebook}
            tone="bg-[#1877F2] text-white"
            onClick={() => openShareUrl("facebook")}
          />
          <ShareOption
            icon={<Download size={30} />}
            label={copy.story}
            tone="bg-gradient-to-br from-[#7B2CFF] via-[#F52D74] to-[#FFB000] text-white"
            onClick={downloadStory}
          />
          <ShareOption
            icon={<MessageCircle size={30} />}
            label={copy.whatsapp}
            tone="bg-[#25D366] text-white"
            onClick={() => openShareUrl("whatsapp")}
          />
          <ShareOption
            icon={<MessageCircle size={28} />}
            label={copy.text}
            tone="bg-neutral-100 text-neutral-700"
            onClick={nativeShare}
          />
          <ShareOption
            icon={<Mail size={28} />}
            label={copy.email}
            tone="bg-neutral-100 text-neutral-700"
            onClick={() => openShareUrl("email")}
          />
          <ShareOption
            icon={<span className="text-2xl font-black">X</span>}
            label="X"
            tone="bg-black text-white"
            onClick={() => openShareUrl("x")}
          />
          <ShareOption
            icon={<MoreHorizontal size={30} />}
            label={copy.more}
            tone="bg-neutral-100 text-neutral-700"
            onClick={nativeShare}
          />
        </div>

        <div className="mt-5 flex min-h-8 items-center justify-between gap-3">
          {busy === "story" ? (
            <p className="text-sm font-bold text-neutral-600">
              {copy.generating}
            </p>
          ) : (
            <FeedbackMessage feedback={feedback} locale={locale} />
          )}
          <button
            className="inline-flex items-center gap-2 text-sm font-black text-[#2D5D5E] hover:underline"
            type="button"
            onClick={downloadStory}
          >
            <Download size={16} />
            {copy.saveImage}
          </button>
        </div>
      </section>
    </div>
  );
}

function ShareOption({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  tone: string;
}) {
  return (
    <button
      className="flex min-w-0 flex-col items-center gap-2 text-center text-sm font-black text-[#2A3534]"
      type="button"
      onClick={onClick}
    >
      <span
        className={`grid size-14 place-items-center rounded-full shadow-sm ${tone}`}
      >
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function FacebookGlyph() {
  return (
    <span
      aria-hidden="true"
      className="font-sans text-[2rem] font-black leading-none text-white"
    >
      f
    </span>
  );
}

function FeedbackMessage({
  feedback,
  locale,
}: {
  feedback: Feedback;
  locale: Locale;
}) {
  if (!feedback) {
    return <span />;
  }

  const copy = getShareCopy(locale);
  const messages: Record<Exclude<Feedback, null>, string> = {
    asset: copy.assetSaved,
    error: copy.error,
    link: copy.copied,
  };

  return (
    <div
      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
        feedback === "error"
          ? "bg-red-50 text-red-700"
          : "bg-[#D9F7B0] text-[#173F3A]"
      }`}
    >
      {feedback === "error" ? null : <Check size={16} />}
      {messages[feedback]}
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

async function createStoryCanvas(campaign: ShareCampaignData, locale: Locale) {
  const copy = getShareCopy(locale);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.fillStyle = colors.yellow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const logo = await loadImage("/vendonar_logo.svg");
  drawTintedImage(context, logo, 310, 237, 379, 98, colors.text);

  const [headlineLine1, headlineLine2] = copy.storyHeadline.split("\n");
  context.fillStyle = colors.dark;
  context.font = "900 71px Manrope, Arial, sans-serif";
  context.fillText(headlineLine1, 64, 474);
  context.fillText(headlineLine2, 64, 556);

  context.font = "400 31px Manrope, Arial, sans-serif";
  wrapText(context, copy.storySubheadline, 66, 625, 914, 52, 2);

  if (campaign.coverImageUrl) {
    const cover = await loadImage(campaign.coverImageUrl);
    drawRoundedImage(context, cover, 64, 712, 952, 538, 36);
  }

  drawRoundedRect(context, 64, 1170, 952, 410, 38);
  context.fillStyle = colors.cream;
  context.fill();

  context.fillStyle = colors.dark;
  context.font = "700 56px Manrope, Arial, sans-serif";
  wrapText(context, campaign.title, 109, 1274, 790, 72, 2);

  drawInfoLine(context, "person", campaign.responsible, 1367, 32);
  drawInfoLine(context, "pin", campaign.affectedArea, 1464, 34);

  const shortUrl = getCampaignShortUrl(campaign);

  if (shortUrl) {
    drawRoundedRect(context, 64, 1620, 952, 96, 48);
    context.fillStyle = colors.dark;
    context.fill();
    drawRoundedRect(context, 83, 1636, 64, 64, 32);
    context.fillStyle = colors.cream;
    context.fill();
    drawArrowIcon(context, 115, 1668);
    context.fillStyle = colors.yellowText;
    context.font = "500 34px Manrope, Arial, sans-serif";
    wrapText(context, shortUrl, 176, 1686, 616, 36, 1);
  }

  return canvas;
}

function drawInfoLine(
  context: CanvasRenderingContext2D,
  icon: "person" | "pin",
  value: string,
  y: number,
  fontSize: number,
) {
  drawRoundedRect(context, 107, y, 68, 68, 34);
  context.fillStyle = "#FFED80";
  context.fill();

  if (icon === "person") {
    drawPersonIcon(context, 141, y + 34);
  } else {
    drawPinIcon(context, 141, y + 34);
  }

  context.fillStyle = colors.dark;
  context.font = `600 ${fontSize}px Manrope, Arial, sans-serif`;
  wrapText(context, value, 199, y + 42, 690, fontSize === 32 ? 38 : 40, 1);
}

function drawRoundedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.save();
  drawRoundedRect(context, x, y, width, height, radius);
  context.clip();

  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function drawTintedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  const buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  const bufferContext = buffer.getContext("2d");

  if (!bufferContext) {
    context.drawImage(image, x, y, width, height);
    return;
  }

  bufferContext.drawImage(image, 0, 0, width, height);
  bufferContext.globalCompositeOperation = "source-in";
  bufferContext.fillStyle = color;
  bufferContext.fillRect(0, 0, width, height);
  context.drawImage(buffer, x, y);
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawPersonIcon(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = colors.dark;
  context.beginPath();
  context.arc(x, y - 9, 9, 0, Math.PI * 2);
  context.fill();
  drawRoundedRect(context, x - 17, y + 8, 34, 18, 10);
  context.fill();
}

function drawPinIcon(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = colors.dark;
  context.beginPath();
  context.moveTo(x, y + 22);
  context.bezierCurveTo(x - 22, y - 2, x - 15, y - 25, x, y - 25);
  context.bezierCurveTo(x + 15, y - 25, x + 22, y - 2, x, y + 22);
  context.fill();
  context.fillStyle = colors.yellow;
  context.beginPath();
  context.arc(x, y - 8, 7, 0, Math.PI * 2);
  context.fill();
}

function drawArrowIcon(context: CanvasRenderingContext2D, x: number, y: number) {
  context.strokeStyle = colors.text;
  context.lineWidth = 5;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(x - 18, y);
  context.lineTo(x + 17, y);
  context.moveTo(x + 2, y - 15);
  context.lineTo(x + 17, y);
  context.lineTo(x + 2, y + 15);
  context.stroke();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = word;

    if (lines.length === maxLines) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  lines.slice(0, maxLines).forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export did not return a blob."));
        }
      },
      type,
      quality,
    );
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = objectUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
