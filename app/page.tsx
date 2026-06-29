import { PublicHomePage } from "@/components/public-home-page";

export const revalidate = 60;

export default async function HomePage() {
  return <PublicHomePage locale="es" />;
}
