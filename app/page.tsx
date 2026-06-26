export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Venayuda Transparencia
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-normal">
          Base lista para campanas de ayuda con transparencia manual.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Esta primera versión deja preparada la estructura, seguridad de datos
          y migraciones. Las campanas, donativos y compras se construyen encima
          de esta base.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Donativos", "Pendientes, validados o rechazados por admins."],
          ["Campanas", "Una persona ayudada directamente en Venezuela."],
          ["Compras", "Gastos aprobados con facturas privadas por defecto."],
          ["Necesidades", "Items por comprar asociados a una campana."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-lg border bg-card p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
