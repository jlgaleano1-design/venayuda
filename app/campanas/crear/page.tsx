import { Button, Card, CardBody, Chip, Link } from "@heroui/react";
import { ArrowLeft } from "lucide-react";

export default function CreateCampaignPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <Button
        as={Link}
        className="w-fit"
        href="/"
        radius="sm"
        startContent={<ArrowLeft size={18} />}
        variant="light"
      >
        Volver
      </Button>
      <Card radius="sm" shadow="sm">
        <CardBody className="gap-4 p-8">
          <Chip color="primary" radius="sm" variant="flat">
            Crear campaña
          </Chip>
          <h1 className="text-3xl font-semibold tracking-normal">
            Estamos preparando este flujo.
          </h1>
          <p className="leading-7 text-foreground-600">
            La creación de campañas será el siguiente paso del producto. Primero
            dejaremos listo el flujo público, revisión admin y reglas de
            transparencia para publicar campañas con seguridad.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
