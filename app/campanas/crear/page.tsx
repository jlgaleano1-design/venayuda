import { ArrowLeft } from "lucide-react";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { FreshHomeLink } from "@/components/fresh-home-link";
import { SiteFooter } from "@/components/site-footer";
import { getActiveAdminProfile } from "@/lib/admin-auth";

export default async function CreateCampaignPage() {
  const canPublishAsVerified = await getCanPublishAsVerified();

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <FreshHomeLink className="inline-flex w-fit items-center gap-2 text-sm">
          <ArrowLeft size={18} />
          Volver
        </FreshHomeLink>

        <div className="space-y-3">
          <span className="soft-pill">
            Crear campaña
          </span>
          <h1 className="text-3xl font-black tracking-normal md:text-4xl">
            Cuéntanos quién está respondiendo y cómo puede recibir ayuda.
          </h1>
          <p className="max-w-2xl leading-7 text-neutral-700">
            Publica métodos de ayuda directa y seguimiento transparente.
            Vendonar no procesa pagos.
          </p>
        </div>

        <CreateCampaignForm canPublishAsVerified={canPublishAsVerified} />
      </section>
      <SiteFooter />
    </main>
  );
}

async function getCanPublishAsVerified() {
  try {
    const { profile } = await getActiveAdminProfile();

    return Boolean(profile);
  } catch {
    return false;
  }
}
