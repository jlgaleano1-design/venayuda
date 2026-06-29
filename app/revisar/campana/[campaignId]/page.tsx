import { CheckCircle2, XCircle } from "lucide-react";
import { ErrorState, errorStateActions } from "@/components/error-state";
import { PublishedCampaignActions } from "@/components/published-campaign-actions";
import { PublicCampaignLink } from "@/components/public-campaign-link";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";
import { verifyCampaignReviewToken } from "@/lib/review-token";
import { createAdminClient } from "@/lib/supabase/admin";

const cryptoCategoryMarker = "Categoría de recepción: Cripto";

const categoryLabels: Record<string, string> = {
  argentina: "Argentina",
  chile: "Chile",
  colombia: "Colombia",
  crypto: "Cripto",
  international: "Internacional / otro",
  mexico: "México",
  other: "Otro",
  panama: "Panamá",
  spain: "España",
  united_states: "Estados Unidos",
  venezuela: "Venezuela",
};

export default async function CampaignReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const { campaignId } = await params;
  const { status, token = "" } = await searchParams;
  const isValidToken = verifyCampaignReviewToken(token, campaignId);

  if (!isValidToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF8] px-6 text-[#2A3534]">
        <ErrorState
          actions={[errorStateActions.backHome]}
          message="Puede haber vencido, haber sido reemplazado o estar incompleto. Vuelve al correo original o pide al equipo un enlace nuevo."
          title="Este enlace de revisión ya no es válido"
          variant="blocked"
        />
      </main>
    );
  }

  const supabase = createAdminClient();
  const [{ data: campaign }, { data: paymentMethods }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "affected_area, contact_info, cover_image_path, description, instagram_handle, location, responsible_organization, responsible_person_name, slug, status, title, verification_status",
      )
      .eq("id", campaignId)
      .single(),
    supabase
      .from("campaign_payment_methods")
      .select(
        "account_holder, method_name, notes, receiving_category, transfer_instructions",
      )
      .eq("campaign_id", campaignId),
  ]);

  if (!campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF8] px-6 text-[#2A3534]">
        <ErrorState
          actions={[errorStateActions.backHome]}
          message="Puede que la solicitud ya no exista, que el enlace no corresponda a esta campaña o que la revisión haya sido cerrada."
          title="No encontramos esta solicitud"
          variant="not-found"
        />
      </main>
    );
  }

  if (campaign.status === "active") {
    const campaignPath = getPublicCampaignPath(campaign.slug);
    const publicCampaignUrl = new URL(
      campaignPath,
      normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org"),
    ).toString();
    const displayCampaignUrl = publicCampaignUrl.replace(/^https?:\/\//, "");
    const coverImageUrl = await createCampaignAssetSignedUrl(
      supabase,
      campaign.cover_image_path,
    );
    const shareCampaign = {
      affectedArea: campaign.affected_area || campaign.location || "Venezuela",
      coverImageUrl: coverImageUrl ?? undefined,
      publicUrl: publicCampaignUrl,
      responsible: campaign.responsible_person_name,
      slug: campaign.slug,
      title: campaign.title,
    };

    return (
      <main className="min-h-screen bg-[#FFFCF8] px-2 pb-28 pt-4 text-[#2A3534] sm:px-6 sm:py-10">
        <section className="mx-auto flex max-w-3xl items-start sm:min-h-[calc(100vh-5rem)] sm:items-center">
          <div className="surface-card w-full overflow-hidden">
            <div className="flex flex-col gap-4 p-4 md:gap-7 md:p-8">
              <div className="relative -mx-4 -mt-4 overflow-hidden rounded-t-[2rem] bg-[#E8F2ED] md:-mx-8 md:-mt-8">
                {coverImageUrl ? (
                  <div
                    aria-label={`Imagen de ${campaign.title}`}
                    className="aspect-[16/9] bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${coverImageUrl})` }}
                  />
                ) : (
                  <div className="aspect-[16/9] bg-[#E8F2ED]" />
                )}
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
                shareCampaign={shareCampaign}
                variant="inline"
              />

              <p className="text-sm font-semibold leading-6 text-[#2D5D5E] md:text-base md:leading-7">
                Gracias por ayudar desde donde estás. Venezuela se sostiene por
                personas como tú: gente que ayuda, organiza y acompaña cuando
                más hace falta.
              </p>

              <p className="border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-600">
                Te enviamos por correo tu enlace privado. Guárdalo para subir
                fotos o comprobantes cuando uses las donaciones.
              </p>
            </div>
          </div>
        </section>
        <PublishedCampaignActions
          campaignPath={campaignPath}
          publicCampaignUrl={publicCampaignUrl}
          shareCampaign={shareCampaign}
          variant="fixed"
        />
      </main>
    );
  }

  const actionUrl = `/api/campaign-requests/${campaignId}/review?token=${encodeURIComponent(
    token,
  )}`;

  return (
    <main className="min-h-screen bg-[#FFFCF8] px-6 py-10 text-[#2A3534]">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="space-y-3">
          <span className="soft-pill">Revisión de campaña</span>
          <h1 className="text-3xl font-black tracking-normal md:text-4xl">
            {campaign.title}
          </h1>
          <p className="max-w-3xl leading-7 text-neutral-700">
            Revisa la información antes de publicar. Al aprobar, la campaña
            pasa a activa y se envía el enlace privado al responsable.
          </p>
        </div>

        {status ? (
          <div
            className={`rounded-[1.5rem] border p-4 text-sm font-bold ${
              status === "approved"
                ? "border-[#2D5D5E]/30 bg-[#2D5D5E]/5 text-[#2D5D5E]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status === "approved"
              ? "Campaña aprobada. El responsable recibirá el link privado si la notificación por correo está disponible."
              : "Campaña rechazada y archivada."}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="surface-card p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Responsable" value={campaign.responsible_person_name} />
              <Info
                label="Organización"
                value={campaign.responsible_organization || "Independiente"}
              />
              <Info label="Zona afectada" value={campaign.affected_area || "-"} />
              <Info label="Link solicitado" value={getPublicCampaignPath(campaign.slug)} />
              <Info
                label="Instagram"
                value={
                  campaign.instagram_handle ? `@${campaign.instagram_handle}` : "-"
                }
              />
              <Info label="Estado" value={campaign.status} />
            </div>
            <div className="mt-5 border-t border-neutral-200 pt-5">
              <p className="text-sm font-bold text-neutral-500">Contacto</p>
              <p className="mt-1 whitespace-pre-line leading-7">
                {campaign.contact_info}
              </p>
            </div>
            <div className="mt-5 border-t border-neutral-200 pt-5">
              <p className="text-sm font-bold text-neutral-500">Descripción</p>
              <p className="mt-1 leading-7 text-neutral-700">
                {campaign.description}
              </p>
            </div>
          </section>

          <aside className="surface-card h-fit p-5">
            <h2 className="text-xl font-extrabold">Decisión</h2>
            <div className="mt-4 flex flex-col gap-3">
              <form action={actionUrl} method="post">
                <input name="decision" type="hidden" value="approve" />
                <button className="btn-primary w-full" type="submit">
                  <CheckCircle2 size={18} />
                  Aprobar campaña
                </button>
              </form>
              <form action={actionUrl} method="post">
                <input name="decision" type="hidden" value="reject" />
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100"
                  type="submit"
                >
                  <XCircle size={18} />
                  Rechazar
                </button>
              </form>
            </div>
          </aside>
        </div>

        <section className="surface-card p-5">
          <h2 className="text-xl font-extrabold">Métodos de pago</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(paymentMethods ?? []).map((method, index) => (
              <div
                className="rounded-[1.5rem] border border-neutral-200 p-4"
                key={`${method.method_name}-${index}`}
              >
                <span className="tag-pill border border-neutral-300 bg-[#FFFCF8] text-neutral-700">
                  {getCategoryLabel(method)}
                </span>
                <p className="mt-3 font-bold">{method.method_name}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  Titular: {method.account_holder}
                </p>
                {getVisibleNotes(method.notes) ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">
                    {getVisibleNotes(method.notes)}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-sm leading-6">
                  {method.transfer_instructions}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function getCategoryLabel(method: {
  notes: string | null;
  receiving_category: string;
}) {
  if (
    method.receiving_category === "international" &&
    method.notes?.includes(cryptoCategoryMarker)
  ) {
    return "Cripto";
  }

  return categoryLabels[method.receiving_category] ?? method.receiving_category;
}

function getVisibleNotes(notes: string | null) {
  return (
    notes
      ?.split("\n")
      .filter((line) => line.trim() !== cryptoCategoryMarker)
      .join("\n")
      .trim() || ""
  );
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

async function createCampaignAssetSignedUrl(
  supabase: ReturnType<typeof createAdminClient>,
  path: string | null,
) {
  if (!path) {
    return null;
  }

  const { data } = await supabase.storage
    .from("campaign-assets")
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-neutral-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
