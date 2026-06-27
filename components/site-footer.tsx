"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";

export function SiteFooter() {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const modalTitleId = useId();

  return (
    <>
      <footer className="border-t border-neutral-200 px-6 py-4 text-sm leading-6 text-neutral-600">
        <div className="mx-auto max-w-6xl">
          <p>
            Vendonar facilita campañas de ayuda directa y seguimiento público.
            No recibimos, retenemos ni procesamos donaciones; cada aporte se
            realiza directamente con la persona responsable.{" "}
            <button
              className="font-semibold text-[#2D5D5E] underline-offset-4 hover:underline"
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
            >
              Más sobre Vendonar &rarr;
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
              aria-label="Cerrar"
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
              Sobre este proyecto
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-neutral-700">
              <p>
                Vendonar es un proyecto independiente y no cobra comisiones ni
                procesa donaciones. Mantenerlo funcionando implica cubrir costos
                como hosting, dominio, base de datos, almacenamiento,
                autenticación y envío de correos transaccionales, usando
                herramientas como Supabase y proveedores de correo.
              </p>
              <p>
                También ha requerido costos de desarrollo y mantenimiento,
                incluyendo créditos de OpenAI/Codex para construir, revisar y
                mejorar la plataforma.
              </p>
              <p>
                Si quieres apoyar con costos operativos, ayudar a revisar
                campañas, proponer mejoras o involucrarte de alguna forma,
                puedes escribirme por Instagram a{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="https://www.instagram.com/jos.galeano"
                  rel="noreferrer"
                  target="_blank"
                >
                  @jos.galeano
                </a>{" "}
                o enviar un email a{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="mailto:jl.galeano1@gmail.com"
                >
                  jl.galeano1@gmail.com
                </a>
              </p>
              <p>Cualquier ayuda suma y se agradece muchísimo.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
