import { PublicHomePage } from "@/components/public-home-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <PublicHomePage locale="es" />;
}
