"use client";

import { Button, Card, Input, TextArea } from "@heroui/react";
import { Plus } from "lucide-react";

const categories = [
  ["mexico", "Mexico"],
  ["united_states", "Estados Unidos"],
  ["venezuela", "Venezuela"],
  ["international", "Internacional / otro"],
];

export function CreateCampaignForm() {
  return (
    <Card className="border border-neutral-200 shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Título de la campaña" />
          <TextField label="Persona responsable" />
          <TextField label="Organización (opcional)" />
          <TextField label="Contacto privado" />
          <TextField label="Ubicación" />
          <TextField label="Zona afectada" />
        </div>
        <TextAreaField label="Descripción / historia" />
        <div className="border-t border-neutral-200 pt-5">
          <h2 className="font-semibold">Primer método de recepción</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Usa instrucciones abiertas. No forzamos campos bancarios por país
            porque cada caso es distinto.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field-label">
            Dónde recibe
            <select className="field" defaultValue="mexico">
              {categories.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Método (SPEI, Zelle, Pago móvil...)" />
          <TextField label="Moneda" />
          <TextField label="Titular / destinatario" />
        </div>
        <TextAreaField label="Instrucciones de transferencia" />
        <Button
          className="w-fit bg-[#2D5D5E] text-[#FAE880]"
          type="button"
          variant="primary"
        >
          <Plus size={18} />
          Enviar solicitud
        </Button>
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
