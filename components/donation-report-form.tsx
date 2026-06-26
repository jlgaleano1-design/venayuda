"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import type { Campaign } from "@/lib/demo-data";

export function DonationReportForm({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="border border-neutral-200 shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Tu nombre (opcional)" />
          <TextField label="Contacto privado (opcional)" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" />
          Donar anonimamente en la vista publica
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Monto" type="number" />
          <TextField label="Moneda" />
          <TextField label="Fecha" type="date" />
        </div>
        <label className="field-label">
          Método usado
          <select className="field" defaultValue={campaign.paymentMethods[0]?.id}>
            {campaign.paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label} · {method.currency}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Referencia / tracking number (opcional)" />
        <TextField label="Comprobante o screenshot" type="file" />
        <TextAreaField label="Mensaje público (opcional)" />
        <Button
          className="w-fit bg-[#2D5D5E] text-[#FAE880]"
          type="button"
          variant="primary"
        >
          Enviar reporte
        </Button>
        <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
          Al enviar, el aporte quedará pendiente. En el flujo conectado se
          generará un código como <span className="font-medium">DON-8F42K</span>{" "}
          y aparecerá públicamente solo después de revisión manual.
        </div>
      </Card.Content>
    </Card>
  );
}

function TextField({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="field-label">
      {label}
      <Input className="field" type={type} variant="secondary" />
    </label>
  );
}

function TextAreaField({ label }: { label: string }) {
  return (
    <label className="field-label">
      {label}
      <TextArea className="textarea-field" variant="secondary" />
    </label>
  );
}
