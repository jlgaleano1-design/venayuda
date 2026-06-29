"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("en");

export default function EnglishErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFCF8] px-6 py-10 text-[#2A3534]">
      <section className="surface-card w-full max-w-xl border-red-200 bg-red-50/70">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle size={22} />
            </span>
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                {t.errors.system}
              </span>
              <h1 className="text-2xl font-black tracking-normal">
                {t.errors.genericTitle}
              </h1>
              <p className="leading-7 text-neutral-700">
                {t.errors.genericMessage}
              </p>
            </div>
          </div>
          <button className="btn-primary w-fit" type="button" onClick={reset}>
            <RotateCcw size={18} />
            {t.errors.retry}
          </button>
        </div>
      </section>
    </main>
  );
}
