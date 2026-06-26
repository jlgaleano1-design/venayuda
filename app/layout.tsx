import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venayuda Transparencia",
  description: "Ledger manual de transparencia para donativos y compras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
