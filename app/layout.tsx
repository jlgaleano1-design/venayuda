import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getDictionary } from "@/lib/i18n";
import { Providers } from "./providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org";
const siteName = "Vendonar";
const t = getDictionary("es");
const siteDescription = t.metadata.siteDescription;
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: t.metadata.siteTitle,
    template: "%s | Vendonar",
  },
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: t.metadata.siteTitle,
    description: siteDescription,
    url: "/",
    siteName,
    images: [
      {
        url: "/vendonar-og-campanas.png",
        width: 1672,
        height: 941,
        alt: t.metadata.ogAlt,
      },
    ],
    locale: t.metadata.ogLocale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: t.metadata.siteTitle,
    description: siteDescription,
    images: ["/vendonar-og-campanas.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={manrope.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
