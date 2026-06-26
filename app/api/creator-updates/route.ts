import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign, getCampaignByCreatorAccessCode } from "@/lib/demo-data";

const creatorUpdateSchema = z.object({
  campaignSlug: z.string().min(1),
  accessCode: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().min(1),
  currency: z.string().min(1),
  purchaseDate: z.string().min(1),
  vendor: z.string().optional(),
  photoFileName: z.string().min(1),
  invoiceFileName: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = creatorUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Faltan datos para registrar la novedad." },
      { status: 400 },
    );
  }

  const update = payload.data;
  const campaign = getCampaign(update.campaignSlug);
  const campaignFromAccess = getCampaignByCreatorAccessCode(update.accessCode);

  if (!campaign || campaignFromAccess?.slug !== campaign.slug) {
    return NextResponse.json(
      { error: "Este enlace no tiene acceso a la campaña." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "pending_review",
    message:
      "Novedad recibida. En Supabase se guardará como compra pendiente con foto privada.",
  });
}
