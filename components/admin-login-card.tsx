"use client";

import { Button, Card, Chip, Input } from "@heroui/react";
import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";

export function AdminLoginCard() {
  return (
    <Card className="surface-card w-full max-w-md shadow-none">
      <Card.Content className="flex flex-col gap-5 p-6">
        <Link className="inline-flex w-fit items-center gap-2 text-sm" href="/">
          <ArrowLeft size={18} />
          Volver
        </Link>
        <div className="space-y-2">
          <Chip className="!rounded-full bg-neutral-100 text-black" variant="soft">
            Admin
          </Chip>
          <h1 className="text-2xl font-black">Entrar al panel</h1>
          <p className="text-sm leading-6 text-neutral-600">
            El login real se conectará con Supabase Auth. Esta pantalla deja
            listo el punto de entrada del MVP.
          </p>
        </div>
        <label className="field-label">
          Email
          <Input className="field" type="email" variant="secondary" />
        </label>
        <label className="field-label">
          Contraseña
          <Input className="field" type="password" variant="secondary" />
        </label>
        <Button
          className="w-fit !rounded-full bg-[#2D5D5E] px-5 font-black text-[#FAE880]"
          type="button"
          variant="primary"
        >
          <LogIn size={18} />
          Entrar
        </Button>
      </Card.Content>
    </Card>
  );
}
