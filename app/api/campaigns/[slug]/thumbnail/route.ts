import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

type CampaignThumbnailRow = {
  cover_image_path: string | null;
};

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const fallbackUrl = new URL("/vendonar-og-campanas.png", request.url);

  try {
    const supabase = createPublicClient();
    const { data: campaign, error } = await supabase
      .from("public_campaigns")
      .select("cover_image_path")
      .eq("slug", slug)
      .single<CampaignThumbnailRow>();

    if (error || !campaign?.cover_image_path) {
      return NextResponse.redirect(fallbackUrl);
    }

    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;
    const { data: image, error: imageError } = await storageClient.storage
      .from("campaign-assets")
      .download(campaign.cover_image_path);

    if (imageError || !image) {
      return NextResponse.redirect(fallbackUrl);
    }

    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": image.type || "image/jpeg",
      },
    });
  } catch {
    return NextResponse.redirect(fallbackUrl);
  }
}
