import { CheckCircle2 } from "lucide-react";
import { PublishedCampaignActions } from "@/components/published-campaign-actions";
import { PublicCampaignLink } from "@/components/public-campaign-link";

export default function PublishedCampaignPreviewPage() {
  const campaignPath = "/venezuela/nelsonlaiton";
  const publicCampaignUrl = "https://vendonar.org/venezuela/nelsonlaiton";
  const displayCampaignUrl = publicCampaignUrl.replace(/^https?:\/\//, "");
  const coverImageUrl = "/preview-campaign-cover-2.png";

  return (
    <main className="min-h-screen bg-[#FFFCF8] px-2 pb-28 pt-4 text-[#2A3534] sm:px-6 sm:py-10">
      <section className="mx-auto flex max-w-3xl items-start sm:min-h-[calc(100vh-5rem)] sm:items-center">
        <div className="surface-card w-full overflow-hidden">
          <div className="flex flex-col gap-4 p-4 md:gap-7 md:p-8">
            <div className="relative -mx-4 -mt-4 overflow-hidden rounded-t-[2rem] bg-[#E8F2ED] md:-mx-8 md:-mt-8">
              <div
                aria-label="Imagen de campaña"
                className="aspect-[16/9] bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${coverImageUrl})` }}
              />
              <span className="absolute left-4 top-4 inline-flex size-12 items-center justify-center rounded-full bg-[#FFFCF8]/90 text-[#2D5D5E] shadow-[0_4px_16px_rgb(42_53_52/8%)] md:size-14">
                <CheckCircle2 size={28} />
              </span>
            </div>

            <div>
              <div>
                <h1 className="text-[1.7rem] font-black leading-tight tracking-normal md:text-4xl">
                  Tu campaña ya está publicada
                </h1>
              </div>
            </div>

            <PublicCampaignLink
              displayUrl={displayCampaignUrl}
              publicCampaignUrl={publicCampaignUrl}
            />

            <PublishedCampaignActions
              campaignPath={campaignPath}
              publicCampaignUrl={publicCampaignUrl}
              variant="inline"
            />

            <p className="border-t border-neutral-200 pt-5 text-sm font-semibold leading-6 text-[#2D5D5E] md:text-base md:leading-7">
              Gracias por ayudar desde donde estás. Venezuela se sostiene por
              personas como tú: gente que ayuda, organiza y acompaña cuando más
              hace falta.
            </p>

            <p className="text-sm leading-6 text-neutral-600">
              Te enviamos por correo tu enlace privado. Guárdalo para subir
              fotos o comprobantes cuando uses las donaciones.
            </p>
          </div>
        </div>
      </section>
      <PublishedCampaignActions
        campaignPath={campaignPath}
        publicCampaignUrl={publicCampaignUrl}
        variant="fixed"
      />
    </main>
  );
}
