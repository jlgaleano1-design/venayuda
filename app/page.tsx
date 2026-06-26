import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CampaignList } from "@/components/campaign-list";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-4xl space-y-6">
          <Image
            alt="Venayuda"
            className="h-12 w-auto"
            height={48}
            src="/venayuda_logo.svg"
            width={282}
          />
          <h1 className="text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
            Ayuda directa para quienes están respondiendo en las calles.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-neutral-700 md:text-xl">
            Campañas persona a persona para apoyar a quienes están respondiendo
            en las zonas más afectadas de Venezuela. Elige una campaña, dona por
            el método disponible y revisa el seguimiento público de cada aporte.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <a className="btn-primary" href="#campanas">
              Donar ahora ⬇️
            </a>
            <Link className="btn-secondary" href="/campanas/crear">
              <Plus size={18} />
              Crear campaña
            </Link>
          </div>
        </div>
      </section>

      <section
        id="campanas"
        className="mx-auto flex max-w-6xl scroll-mt-8 flex-col gap-5 px-6 pb-16"
      >
        <div className="flex flex-col gap-2">
          <span className="w-fit bg-neutral-100 px-3 py-1 text-sm font-medium text-black">
            Campañas
          </span>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">
                Todas las campañas creadas
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Cada campaña muestra cuánto fue verificado, cuánto se gastó y
                qué saldo queda disponible. Las donaciones pasan por revisión
                manual antes de aparecer en los totales públicos.
              </p>
            </div>
          </div>
        </div>
        <CampaignList />
      </section>
    </main>
  );
}
