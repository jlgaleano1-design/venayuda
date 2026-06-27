import { PackageCheck, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CampaignList } from "@/components/campaign-list";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaigns } from "@/lib/campaign-data";

export default async function HomePage() {
  const campaigns = await getPublicCampaigns();

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-4xl space-y-6">
          <Image
            alt="Vendonar"
            className="h-12 w-auto"
            height={48}
            src="/vendonar_logo.svg"
            width={188}
          />
          <h1 className="text-4xl font-black leading-tight tracking-normal md:text-6xl">
            Ayuda directa,
            <br />
            sin intermediarios.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-neutral-700 md:text-xl">
            Campañas creadas por personas que están apoyando directamente en las
            zonas más afectadas de Venezuela por el terremoto. Dona directo y
            sigue públicamente cómo se registra y utiliza tu aporte.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <a className="btn-primary" href="#campanas">
              Donar ahora <span aria-hidden="true">&darr;</span>
            </a>
            <Link className="btn-secondary" href="/campanas/crear">
              <Plus size={18} />
              Crear campaña
            </Link>
            <Link className="btn-secondary" href="/donar-en-especies">
              <PackageCheck size={18} />
              Centros de acopio en el mundo
            </Link>
          </div>
        </div>
      </section>

      <section
        id="campanas"
        className="mx-auto flex max-w-6xl scroll-mt-8 flex-col gap-5 px-6 pb-16"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-extrabold tracking-normal">
                Campañas publicadas
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Elige una campaña y dona directamente a una de las cuentas o
                métodos disponibles. Ninguna donación pasa por nosotros; la
                plataforma solo ayuda a registrar aportes y mostrar el
                seguimiento público.
              </p>
            </div>
          </div>
        </div>
        <CampaignList campaigns={campaigns} />
      </section>
      <SiteFooter />
    </main>
  );
}
