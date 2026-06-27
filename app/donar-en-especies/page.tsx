import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CollectionCenterList } from "@/components/collection-center-list";
import { SiteFooter } from "@/components/site-footer";
import { getCollectionCenters } from "@/lib/collection-centers";

export const dynamic = "force-dynamic";

const sheetUrl =
  "https://docs.google.com/spreadsheets/u/1/d/1OTNQGMsK3nU2wqy00rtPPcwsSzAlorWeP-uIotWpkxM/htmlview#gid=115303742";
const reportCenterUrl = "https://www.centrosdeacopiovzla.com/#aportar";

export default async function DonateGoodsPage() {
  const centers = await getCollectionCenters();

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#2A3534]">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Link className="btn-secondary" href="/">
            <ArrowLeft size={18} />
            Volver
          </Link>
          <Link href="/" aria-label="Ir al inicio">
            <Image
              alt="Vendonar"
              className="h-9 w-auto"
              height={36}
              src="/vendonar_logo.svg"
              width={141}
            />
          </Link>
        </div>

        <div className="max-w-4xl space-y-5">
          <h1 className="text-4xl font-black leading-tight tracking-normal md:text-6xl">
            Centros de acopio
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-neutral-700 md:text-xl">
            Puntos que reciben medicinas, alimentos, artículos de higiene, ropa
            e insumos en todo el mundo.
          </p>
        </div>
      </section>

      <section
        id="centros"
        className="mx-auto flex max-w-6xl scroll-mt-8 flex-col gap-5 px-6 pb-16"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm leading-6 text-neutral-600">
                Esta lista se alimenta automáticamente del spreadsheet impulsado
                por{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="https://www.instagram.com/marielozadab"
                  rel="noreferrer"
                  target="_blank"
                >
                  @marielozadab
                </a>{" "}
                y{" "}
                <a
                  className="font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href="https://www.instagram.com/nathaliesayago"
                  rel="noreferrer"
                  target="_blank"
                >
                  @nathaliesayago
                </a>
                . Se actualiza cada 24 horas desde la Sheet original.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <a
                className="btn-primary px-3 text-center text-xs sm:px-5 sm:text-sm"
                href={reportCenterUrl}
                rel="noreferrer"
                target="_blank"
              >
                Reportar nuevo centro
              </a>
              <a
                className="btn-secondary px-3 text-center text-xs sm:px-5 sm:text-sm"
                href={sheetUrl}
                rel="noreferrer"
                target="_blank"
              >
                Ver Sheet original
              </a>
            </div>
          </div>
        </div>
        <CollectionCenterList centers={centers} />
      </section>
      <SiteFooter />
    </main>
  );
}
