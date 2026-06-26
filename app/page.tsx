import { Button, Card, CardBody, Chip, Link } from "@heroui/react";
import { Plus } from "lucide-react";

export default function HomePage() {
  const campaignPlaceholders = [
    [
      "Campaña de medicinas",
      "Apoyo para comprar tratamientos urgentes y registrar cada compra aprobada.",
      "En preparación",
    ],
    [
      "Alimentos y agua",
      "Ayuda directa para familias atendidas por personas voluntarias en campo.",
      "En preparación",
    ],
    [
      "Traslados y logística",
      "Fondos para mover insumos, personas y compras hacia zonas afectadas.",
      "En preparación",
    ],
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-4xl space-y-6">
          <Chip color="primary" radius="sm" variant="flat">
            Venayuda
          </Chip>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-foreground md:text-6xl">
            Ayuda directa para quienes están respondiendo en las calles.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-foreground-600 md:text-xl">
            Campañas persona a persona para apoyar a quienes están respondiendo
            en las zonas más afectadas de Venezuela. Elige una campaña, dona por
            el método disponible y revisa el seguimiento público de cada aporte.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              as={Link}
              color="primary"
              href="#campanas"
              radius="sm"
              size="lg"
            >
              Donar ahora ⬇️
            </Button>
            <Button
              as={Link}
              href="/campanas/crear"
              radius="sm"
              size="lg"
              startContent={<Plus size={18} />}
              variant="bordered"
            >
              Crear campaña
            </Button>
          </div>
        </div>
      </section>

      <section
        id="campanas"
        className="mx-auto flex max-w-6xl scroll-mt-8 flex-col gap-5 px-6 pb-16"
      >
        <div className="flex flex-col gap-2">
          <Chip color="secondary" radius="sm" variant="flat">
            Campañas
          </Chip>
          <h2 className="text-2xl font-semibold tracking-normal">
            Todas las campañas creadas
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {campaignPlaceholders.map(([title, description, status]) => (
            <Card key={title} radius="sm" shadow="sm">
              <CardBody className="gap-3 p-5">
                <Chip color="warning" radius="sm" size="sm" variant="flat">
                  {status}
                </Chip>
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="text-sm leading-6 text-foreground-600">
                  {description}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
