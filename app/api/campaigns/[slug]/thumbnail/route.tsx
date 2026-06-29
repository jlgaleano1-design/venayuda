import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

type CampaignThumbnailRow = {
  affected_area: string | null;
  cover_image_path: string | null;
  title: string;
};

const size = {
  height: 630,
  width: 1200,
};

const colors = {
  cream: "#FFFADE",
  dark: "#063127",
  text: "#13271B",
  yellow: "#FEDA5B",
};

const vendonarLogoSvg = `<svg width="238" height="62" viewBox="0 0 238 62" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.67003 35.2274C7.62683 35.1711 7.58708 35.1115 7.55576 35.0478C6.82142 33.5537 7.90612 31.7812 9.59551 31.7812H10.9846C11.4566 31.7812 11.91 31.965 12.2488 32.2935L19.324 39.1544C24.2283 43.91 32.0143 43.9393 36.9542 39.2206L44.2159 32.2841C44.5537 31.9613 45.003 31.7812 45.4702 31.7812H46.3685C48.0664 31.7812 49.1504 33.5697 48.3999 35.0648C48.3679 35.1285 48.3275 35.1879 48.2836 35.2441L37.3544 49.2295C34.4385 53.0121 31.8066 54.7892 27.8725 54.7892C23.9052 54.7892 21.8831 53.0121 18.3456 49.1483L7.67003 35.2274Z" fill="#063127"/><path d="M13.5801 23.1924L12.9941 25.3828L12.4053 27.5771L0 24.252L1.17871 19.8672L13.5801 23.1924ZM55.6953 23.1084L44.1367 26.4287L43.5068 24.248L42.8818 22.0664L54.4443 18.7412L55.6953 23.1084ZM48.2334 9.5498L39.1533 18.6299L35.9434 15.4199L45.0234 6.33984L48.2334 9.5498ZM20.9932 14.2852L17.7832 17.4951L8.70312 8.41504L11.9131 5.20508L20.9932 14.2852ZM30.7383 12.8398H26.1982V0H30.7383V12.8398Z" fill="#063127"/><path d="M74.5265 45.79L66.0502 25.4782H72.3L76.3623 37.0794C76.7269 38.121 77.0134 39.2017 77.2217 40.3215C77.43 39.2017 77.7165 38.121 78.081 37.0794L82.1434 25.4782H88.276L79.8388 45.79H74.5265ZM97.6843 46.2978C95.601 46.2978 93.7652 45.8161 92.1767 44.8526C90.5882 43.8891 89.3512 42.6131 88.4658 41.0246C87.6065 39.41 87.1768 37.6262 87.1768 35.6732C87.1768 33.7201 87.6325 31.9363 88.544 30.3218C89.4554 28.6812 90.6923 27.3792 92.2548 26.4156C93.8433 25.4521 95.6531 24.9704 97.6843 24.9704C99.7155 24.9704 101.499 25.4521 103.036 26.4156C104.598 27.3792 105.809 28.6812 106.668 30.3218C107.554 31.9363 107.996 33.7201 107.996 35.6732C107.996 35.9596 107.983 36.2591 107.957 36.5716C107.931 36.8841 107.892 37.2096 107.84 37.5481H92.6454C92.9318 38.746 93.5047 39.7225 94.3641 40.4777C95.2495 41.2329 96.3562 41.6105 97.6843 41.6105C98.8301 41.6105 99.8196 41.3501 100.653 40.8293C101.512 40.3084 102.176 39.6574 102.645 38.8762L106.747 41.962C105.939 43.238 104.728 44.2797 103.114 45.0869C101.499 45.8942 99.6894 46.2978 97.6843 46.2978ZM97.6062 29.5015C96.3562 29.5015 95.2885 29.8791 94.4032 30.6343C93.5178 31.3895 92.9318 32.379 92.6454 33.6029H102.684C102.398 32.4832 101.799 31.5197 100.887 30.7124C100.002 29.9051 98.9082 29.5015 97.6062 29.5015ZM110.311 45.79V25.4782H115.507V28.4468C116.574 26.1552 118.645 25.0094 121.717 25.0094C123.176 25.0094 124.491 25.348 125.663 26.025C126.834 26.7021 127.759 27.6656 128.436 28.9156C129.113 30.1655 129.451 31.6499 129.451 33.3686V45.79H124.178V34.6576C124.178 32.8868 123.775 31.6108 122.967 30.8296C122.16 30.0223 121.105 29.6187 119.803 29.6187C118.684 29.6187 117.694 30.0223 116.835 30.8296C116.001 31.6108 115.585 32.8868 115.585 34.6576V45.79H110.311ZM141.655 46.2978C139.806 46.2978 138.114 45.8291 136.577 44.8916C135.067 43.9281 133.856 42.6521 132.945 41.0636C132.059 39.4491 131.617 37.6653 131.617 35.7122C131.617 34.2539 131.877 32.8868 132.398 31.6108C132.919 30.3088 133.635 29.176 134.546 28.2125C135.458 27.2229 136.512 26.4547 137.71 25.9079C138.934 25.335 140.249 25.0485 141.655 25.0485C143.4 25.0485 144.767 25.374 145.757 26.025C146.746 26.6761 147.515 27.5354 148.061 28.6031V17.2753H153.335V45.79H148.218V42.4698C147.671 43.6156 146.89 44.5401 145.874 45.2432C144.884 45.9463 143.478 46.2978 141.655 46.2978ZM142.515 41.5324C143.687 41.5324 144.689 41.272 145.522 40.7511C146.382 40.2043 147.046 39.4882 147.515 38.6028C147.983 37.7174 148.218 36.7539 148.218 35.7122C148.218 34.6446 147.983 33.668 147.515 32.7826C147.046 31.8972 146.382 31.1811 145.522 30.6343C144.689 30.0874 143.687 29.814 142.515 29.814C141.395 29.814 140.405 30.0874 139.546 30.6343C138.713 31.1551 138.062 31.8582 137.593 32.7436C137.124 33.629 136.89 34.6055 136.89 35.6732C136.89 36.6888 137.124 37.6523 137.593 38.5637C138.062 39.4491 138.713 40.1652 139.546 40.7121C140.405 41.2589 141.395 41.5324 142.515 41.5324ZM166.507 46.2978C164.423 46.2978 162.561 45.8161 160.921 44.8526C159.28 43.8891 157.991 42.6131 157.054 41.0246C156.142 39.41 155.687 37.6262 155.687 35.6732C155.687 33.7201 156.142 31.9363 157.054 30.3218C157.991 28.7072 159.28 27.4182 160.921 26.4547C162.561 25.4912 164.423 25.0094 166.507 25.0094C168.616 25.0094 170.478 25.4912 172.092 26.4547C173.733 27.4182 175.009 28.7072 175.92 30.3218C176.858 31.9363 177.327 33.7201 177.327 35.6732C177.327 37.6262 176.858 39.41 175.92 41.0246C175.009 42.6131 173.733 43.8891 172.092 44.8526C170.478 45.8161 168.616 46.2978 166.507 46.2978ZM166.507 41.4933C167.626 41.4933 168.603 41.2329 169.436 40.7121C170.269 40.1652 170.907 39.4491 171.35 38.5637C171.819 37.6783 172.053 36.7148 172.053 35.6732C172.053 34.6055 171.819 33.629 171.35 32.7436C170.907 31.8582 170.269 31.1551 169.436 30.6343C168.603 30.0874 167.626 29.814 166.507 29.814C165.387 29.814 164.41 30.0874 163.577 30.6343C162.744 31.1551 162.093 31.8582 161.624 32.7436C161.181 33.629 160.96 34.6055 160.96 35.6732C160.96 36.7148 161.181 37.6783 161.624 38.5637C162.093 39.4491 162.744 40.1652 163.577 40.7121C164.41 41.2329 165.387 41.4933 166.507 41.4933ZM179.66 45.79V25.4782H184.856V28.4468C185.923 26.1552 187.994 25.0094 191.066 25.0094C192.525 25.0094 193.84 25.348 195.012 26.025C196.183 26.7021 197.108 27.6656 197.785 28.9156C198.462 30.1655 198.8 31.6499 198.8 33.3686V45.79H193.527V34.6576C193.527 32.8868 193.124 31.6108 192.316 30.8296C191.509 30.0223 190.454 29.6187 189.152 29.6187C188.033 29.6187 187.043 30.0223 186.184 30.8296C185.35 31.6108 184.934 32.8868 184.934 34.6576V45.79H179.66ZM211.004 46.2978C209.155 46.2978 207.463 45.8291 205.926 44.8916C204.416 43.9281 203.205 42.6521 202.294 41.0636C201.408 39.4491 200.966 37.6653 200.966 35.7122C200.966 34.2539 201.226 32.8868 201.747 31.6108C202.268 30.3088 202.984 29.176 203.895 28.2125C204.807 27.2229 205.861 26.4547 207.059 25.9079C208.283 25.335 209.598 25.0485 211.004 25.0485C212.775 25.0485 214.155 25.387 215.145 26.0641C216.134 26.7151 216.903 27.5875 217.449 28.6812V25.4782H222.684V45.79H217.567V42.4698C217.02 43.6156 216.239 44.5401 215.223 45.2432C214.233 45.9463 212.827 46.2978 211.004 46.2978ZM211.864 41.5324C213.036 41.5324 214.038 41.272 214.871 40.7511C215.731 40.2043 216.395 39.4882 216.864 38.6028C217.332 37.7174 217.567 36.7539 217.567 35.7122C217.567 34.6446 217.332 33.668 216.864 32.7826C216.395 31.8972 215.731 31.1811 214.871 30.6343C214.038 30.0874 213.036 29.814 211.864 29.814C210.744 29.814 209.754 30.0874 208.895 30.6343C208.062 31.1551 207.411 31.8582 206.942 32.7436C206.473 33.629 206.239 34.6055 206.239 35.6732C206.239 36.6888 206.473 37.6523 206.942 38.5637C207.411 39.4491 208.062 40.1652 208.895 40.7121C209.754 41.2589 210.744 41.5324 211.864 41.5324ZM225.817 45.79V25.4782H230.934V29.3452C231.272 27.887 231.962 26.7802 233.004 26.025C234.046 25.2438 235.452 24.9053 237.223 25.0094V29.9702H236.481C234.97 29.9702 233.694 30.452 232.653 31.4155C231.611 32.379 231.09 33.7071 231.09 35.3997V45.79H225.817Z" fill="#063127"/></svg>`;

const vendonarLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(
  vendonarLogoSvg,
).toString("base64")}`;

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const supabase = createPublicClient();
    const { data: campaign, error } = await supabase
      .from("public_campaigns")
      .select("affected_area, cover_image_path, title")
      .eq("slug", slug)
      .single<CampaignThumbnailRow>();

    if (error || !campaign) {
      return createThumbnailResponse({
        campaignTitle: "Donaciones directas para Venezuela",
      });
    }

    const coverImageUrl = await getCampaignCoverDataUrl(
      supabase,
      campaign.cover_image_path,
    );

    return createThumbnailResponse({
      affectedArea: campaign.affected_area ?? undefined,
      campaignTitle: campaign.title,
      coverImageUrl,
    });
  } catch {
    return createThumbnailResponse({
      campaignTitle: "Donaciones directas para Venezuela",
    });
  }
}

function createThumbnailResponse({
  affectedArea,
  campaignTitle,
  coverImageUrl,
}: {
  affectedArea?: string;
  campaignTitle: string;
  coverImageUrl?: string;
}) {
  const titleFontSize = fitTitleFontSize(campaignTitle);
  const titleOffsets = [
    { left: 543.8, top: 193 },
    { left: 545, top: 191.8 },
    { left: 545, top: 193 },
    { left: 545, top: 194.2 },
    { left: 546.2, top: 193 },
  ];
  const venezuelaOffsets = [
    { left: 948, top: 86 },
    { left: 949, top: 86 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          background: colors.yellow,
          color: colors.text,
          display: "flex",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: colors.cream,
            borderBottomRightRadius: 86,
            borderTopRightRadius: 86,
            display: "flex",
            height: 630,
            left: -17,
            overflow: "hidden",
            position: "absolute",
            top: 0,
            width: 513,
          }}
        >
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              src={coverImageUrl}
              style={{
                height: "100%",
                objectFit: "cover",
                width: "100%",
              }}
            />
          ) : null}
        </div>

        <div
          style={{
            color: colors.dark,
            display: "flex",
            fontSize: 33.36,
            fontWeight: 400,
            left: 545,
            letterSpacing: 0,
            lineHeight: 1,
            position: "absolute",
            top: 86,
          }}
        >
          Donaciones directas para
        </div>

        {venezuelaOffsets.map((offset) => (
          <div
            key={`venezuela-${offset.left}`}
            style={{
              color: colors.dark,
              display: "flex",
              fontSize: 33.36,
              fontWeight: 900,
              left: offset.left,
              letterSpacing: 0,
              lineHeight: 1,
              position: "absolute",
              top: offset.top,
            }}
          >
            Venezuela
          </div>
        ))}

        {titleOffsets.map((offset) => (
          <div
            key={`${offset.left}-${offset.top}`}
            style={{
              color: colors.dark,
              display: "flex",
              fontSize: titleFontSize,
              fontWeight: 900,
              left: offset.left,
              lineHeight: 0.98,
              position: "absolute",
              top: offset.top,
              width: 578,
            }}
          >
            {campaignTitle}
          </div>
        ))}

        {affectedArea ? (
          <div
            style={{
              color: colors.dark,
              display: "flex",
              fontSize: 33.36,
              fontWeight: 400,
              left: 545,
              lineHeight: 1,
              position: "absolute",
              top: 556,
            }}
          >
            {affectedArea}
          </div>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Vendonar"
          src={vendonarLogoDataUrl}
          style={{
            height: 62,
            left: 920,
            objectFit: "contain",
            position: "absolute",
            top: 526,
            width: 238,
          }}
        />
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

function fitTitleFontSize(title: string) {
  if (title.length > 58) {
    return 58;
  }

  if (title.length > 42) {
    return 64;
  }

  return 72;
}

async function getCampaignCoverDataUrl(
  supabase: ReturnType<typeof createPublicClient>,
  coverImagePath: string | null,
) {
  if (!coverImagePath) {
    return undefined;
  }

  const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : supabase;
  const { data: image, error } = await storageClient.storage
    .from("campaign-assets")
    .download(coverImagePath);

  if (error || !image) {
    return undefined;
  }

  const buffer = Buffer.from(await image.arrayBuffer());

  return `data:${image.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}
