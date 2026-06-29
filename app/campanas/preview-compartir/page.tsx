import { ShareCampaignButton } from "@/components/share-campaign-button";
import type { ShareCampaignData } from "@/lib/share-campaign";

export const dynamic = "force-dynamic";

const previewCampaign: ShareCampaignData = {
  affectedArea: "La Guaira / Litoral Central",
  coverImageUrl: "/preview-campaign-cover-2.png",
  publicUrl: "https://vendonar.org/venezuela/ayuda-playa-grande",
  responsible: "Nelson Augusto Laiton La Corte",
  slug: "ayuda-playa-grande",
  title: "Ayuda urgente en Playa Grande",
};

export default function CampaignSharePreviewPage() {
  return (
    <main className="min-h-screen bg-[#FFFCF8] px-5 py-8 text-[#2A3534] sm:px-8 sm:py-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-3xl space-y-4">
          <span className="soft-pill">Prototipo local</span>
          <h1 className="text-4xl font-black leading-tight tracking-normal sm:text-5xl">
            Compartir campañas
          </h1>
          <p className="text-lg leading-8 text-neutral-700">
            Ruta aislada para probar el modal final de compartir en español.
          </p>
          <div className="flex flex-wrap gap-3">
            <ShareCampaignButton campaign={previewCampaign} locale="es" />
          </div>
        </div>

        <section className="surface-card overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="h-16 w-20 overflow-hidden rounded-2xl bg-[#2E524D] bg-cover bg-center"
              style={{
                backgroundImage: `url(${previewCampaign.coverImageUrl})`,
              }}
            />
            <div>
              <p className="text-xs font-black uppercase text-[#2D5D5E]">
                Campaña de ejemplo
              </p>
              <h2 className="text-xl font-black leading-tight">
                {previewCampaign.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600">
                {previewCampaign.affectedArea}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
