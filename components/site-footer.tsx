"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale = "es" }: { locale?: Locale }) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const modalTitleId = useId();
  const t = getDictionary(locale).footer;

  return (
    <>
      <footer className="border-t border-neutral-200 px-6 py-4 text-sm leading-6 text-neutral-600">
        <div className="mx-auto max-w-6xl">
          <p>
            {t.summary}{" "}
            <button
              className="font-semibold text-[#2D5D5E] underline-offset-4 hover:underline"
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
            >
              {t.more} &rarr;
            </button>
          </p>
        </div>
      </footer>

      {isProjectModalOpen ? (
        <div
          aria-labelledby={modalTitleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A3534]/45 px-5 py-8"
          role="dialog"
          onClick={() => setIsProjectModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-[2rem] border border-neutral-200 bg-[#FFFCF8] p-6 text-[#2A3534] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label={t.close}
              className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-[#2A3534] shadow-sm transition hover:border-[#2D5D5E]/30 hover:bg-white"
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
            >
              <X size={18} />
            </button>
            <h2
              className="max-w-[calc(100%-3rem)] text-lg font-black"
              id={modalTitleId}
            >
              {t.title}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-neutral-700">
              <p>{t.paragraphs[0]}</p>
              <p>{t.paragraphs[1]}</p>
              <p>
                {t.paragraphs[2]}{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="https://www.instagram.com/jos.galeano"
                  rel="noreferrer"
                  target="_blank"
                >
                  @jos.galeano
                </a>{" "}
                /{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="mailto:jl.galeano1@gmail.com"
                >
                  jl.galeano1@gmail.com
                </a>
              </p>
              <p>{t.paragraphs[3]}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
