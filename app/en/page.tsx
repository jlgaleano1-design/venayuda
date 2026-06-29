import type { Metadata } from "next";
import { PublicHomePage } from "@/components/public-home-page";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("en");

export const metadata: Metadata = {
  title: t.metadata.siteTitle,
  description: t.metadata.siteDescription,
  openGraph: {
    title: t.metadata.siteTitle,
    description: t.metadata.siteDescription,
    locale: t.metadata.ogLocale,
  },
  twitter: {
    title: t.metadata.siteTitle,
    description: t.metadata.siteDescription,
  },
};

export const revalidate = 60;

export default async function EnglishHomePage() {
  return <PublicHomePage locale="en" />;
}
