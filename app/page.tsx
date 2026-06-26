import { Card, CardBody, Chip } from "@heroui/react";

export default function HomePage() {
  const foundations = [
    ["Donativos", "Pendientes, validados o rechazados por admins."],
    ["Campanas", "Una persona ayudada directamente en Venezuela."],
    ["Compras", "Gastos aprobados con facturas privadas por defecto."],
    ["Necesidades", "Items por comprar asociados a una campana."],
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <Chip color="primary" radius="sm" variant="flat">
          Venayuda Transparencia
        </Chip>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-normal">
          Base lista para campanas de ayuda con transparencia manual.
        </h1>
        <p className="max-w-2xl text-foreground-600">
          Esta primera versión deja preparada la estructura, seguridad de datos
          y migraciones. Las campanas, donativos y compras se construyen encima
          de esta base.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-4">
        {foundations.map(([title, description]) => (
          <Card key={title} shadow="sm" radius="sm">
            <CardBody className="gap-2 p-5">
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-foreground-600">{description}</p>
            </CardBody>
          </Card>
        ))}
      </section>
    </main>
  );
}
