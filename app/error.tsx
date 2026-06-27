"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFCF8] px-6 py-10 text-[#161d21]">
      <section className="surface-card w-full max-w-xl border-red-200 bg-red-50/70">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle size={22} />
            </span>
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                Sistema
              </span>
              <h1 className="text-2xl font-black tracking-normal">
                Algo no salió bien
              </h1>
              <p className="leading-7 text-neutral-700">
                No pudimos completar la acción. Tus datos pueden no haberse
                guardado, así que intenta de nuevo en unos minutos.
              </p>
            </div>
          </div>
          <button className="btn-primary w-fit" type="button" onClick={reset}>
            <RotateCcw size={18} />
            Intentar de nuevo
          </button>
        </div>
      </section>
    </main>
  );
}
