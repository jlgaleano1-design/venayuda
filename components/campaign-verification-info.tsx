"use client";

import { CheckCircle2, ChevronDown, Info, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

type CampaignVerificationInfoProps = {
  className?: string;
  locale?: Locale;
  verified: boolean;
  variant: "desktop-dropdown" | "mobile-chip";
};

export function CampaignVerificationInfo({
  className,
  locale = "es",
  verified,
  variant,
}: CampaignVerificationInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localPreviewVerified, setLocalPreviewVerified] = useState<
    boolean | null
  >(null);
  const displayedVerified = localPreviewVerified ?? verified;
  const copy = getVerificationCopy(locale, displayedVerified);
  const dialogTitleId = useId();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const previewVerification = new URLSearchParams(window.location.search).get(
      "previewVerification",
    );

    if (previewVerification === "unverified") {
      setLocalPreviewVerified(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || variant !== "mobile-chip") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, variant]);

  if (variant === "desktop-dropdown") {
    return (
      <section
        className={`surface-card overflow-hidden border-[#2D5D5E]/20 shadow-sm ${className ?? ""}`}
      >
        <button
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-base font-black text-[#2A3534]">
            {displayedVerified ? (
              <CheckCircle2
                aria-hidden="true"
                className="shrink-0 text-emerald-700"
                size={18}
              />
            ) : (
              <Info
                aria-hidden="true"
                className="shrink-0 text-[#2D5D5E]"
                size={18}
              />
            )}
            {copy.title}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`shrink-0 text-neutral-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>
        {isOpen ? (
          <div className="border-t border-neutral-200 px-5 pb-5 pt-4">
            <VerificationBody copy={copy} />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <>
      <button
        className={`status-pill gap-1.5 bg-emerald-50 text-emerald-800 underline decoration-emerald-700/40 underline-offset-4 hover:bg-emerald-100 ${className ?? ""}`}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {displayedVerified ? (
          <CheckCircle2 aria-hidden="true" size={14} />
        ) : (
          <Info aria-hidden="true" size={14} />
        )}
        <span>{copy.shortLabel}</span>
        <span aria-hidden="true">-&gt;</span>
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-labelledby={dialogTitleId}
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A3534]/45 px-4 py-8"
              role="dialog"
              onClick={() => setIsOpen(false)}
            >
              <section
                className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#FEFEFE] px-6 py-7 shadow-2xl sm:p-8"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-5">
                  <h2
                    id={dialogTitleId}
                    className="inline-flex min-w-0 items-center gap-2 text-xl font-black leading-tight"
                  >
                    {displayedVerified ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="text-emerald-700"
                        size={20}
                      />
                    ) : (
                      <Info
                        aria-hidden="true"
                        className="text-[#2D5D5E]"
                        size={20}
                      />
                    )}
                    {copy.title}
                  </h2>
                  <button
                    aria-label={copy.close}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    type="button"
                    onClick={() => setIsOpen(false)}
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                </div>
                <div className="mt-4">
                  <VerificationBody copy={copy} />
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function VerificationBody({
  copy,
}: {
  copy: ReturnType<typeof getVerificationCopy>;
}) {
  return (
    <div className="space-y-4 text-sm leading-6 text-neutral-700">
      <p>{copy.intro}</p>
      <p>
        {copy.unverifiedIntro}{" "}
        <strong className="font-extrabold text-[#2A3534]">
          {copy.unverified}
        </strong>{" "}
        {copy.unverifiedMiddle}{" "}
        <strong className="font-extrabold text-[#2A3534]">
          {copy.verified}
        </strong>{" "}
        {copy.verifiedDetails}
      </p>
      <p>{copy.disclaimer}</p>
      <p>
        {copy.reviewUpdates}{" "}
        <a
          className="font-extrabold text-[#2D5D5E] underline underline-offset-4"
          href="mailto:contacto@vendonar.org"
        >
          contacto@vendonar.org
        </a>
      </p>
    </div>
  );
}

function getVerificationCopy(locale: Locale, verified: boolean) {
  if (locale === "en") {
    return {
      close: "Close",
      disclaimer:
        "Verification does not mean Vendonar manages the money or guarantees every future expense. Donations are made directly to each campaign's payment methods.",
      intro:
        "In Vendonar, anyone can publish a campaign immediately so help can move quickly.",
      reviewUpdates:
        "If we receive new information, questions, or community reports, we may review a campaign again and update its status.",
      shortLabel: verified ? "Verified" : "Not verified",
      title: verified ? "Verified campaign" : "Campaign not verified",
      unverified: "unverified campaigns",
      unverifiedIntro: "",
      unverifiedMiddle:
        "have not yet been reviewed by our team. Campaigns that are",
      verified: "verified",
      verifiedDetails:
        "have passed a basic review of the available information: responsible person, clear need, and enough details for the community to donate with more confidence.",
    };
  }

  return {
    close: "Cerrar",
    disclaimer:
      "La verificación no significa que Vendonar administre el dinero o garantice cada gasto futuro. Las donaciones se hacen directamente a los métodos de pago de cada campaña.",
    intro:
      "En Vendonar cualquier persona puede publicar una campaña de inmediato para que la ayuda pueda moverse rápido.",
    reviewUpdates:
      "Si recibimos nueva información, dudas o reportes de la comunidad, podemos volver a revisar una campaña y actualizar su estado.",
    shortLabel: verified ? "Verificada" : "No verificada",
    title: verified ? "Campaña verificada" : "Campaña no verificada",
    unverified: "no verificadas",
    unverifiedIntro: "Las campañas",
    unverifiedMiddle:
      "aún no han sido revisadas por nuestro equipo. Las campañas",
    verified: "verificadas",
    verifiedDetails:
      "ya pasaron por una revisión básica de la información disponible: persona responsable, necesidad clara y datos suficientes para que la comunidad pueda donar con más confianza.",
  };
}
