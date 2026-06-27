import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { SiteFooter } from "@/components/site-footer";

export default function CreateCampaignPage() {
  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#121515]">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <Link className="inline-flex w-fit items-center gap-2 text-sm" href="/">
          <ArrowLeft size={18} />
          Volver
        </Link>

        <div className="space-y-3">
          <span className="soft-pill">
            Crear campaña
          </span>
          <h1 className="text-3xl font-black tracking-normal md:text-4xl">
            Cuéntanos quién está respondiendo y cómo puede recibir ayuda.
          </h1>
          <p className="max-w-2xl leading-7 text-neutral-700">
            Las campañas se publican después de una revisión manual. Vendonar no
            procesa pagos; solo ayuda a publicar instrucciones, reportar aportes
            y mantener seguimiento transparente.
          </p>
        </div>

        <CreateCampaignForm />
      </section>
      <SiteFooter />
    </main>
  );
}
