"use client";

import { Button, Card, Chip, Input } from "@heroui/react";
import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "inactive"
      ? "Tu usuario no tiene un perfil admin activo."
      : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError("No pudimos iniciar sesión con esos datos.");
      setIsSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("user_id")
      .eq("active", true)
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      setError("Tu usuario no tiene un perfil admin activo.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <Card className="surface-card w-full max-w-md shadow-none">
      <Card.Content className="p-6">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <Link className="inline-flex w-fit items-center gap-2 text-sm" href="/">
            <ArrowLeft size={18} />
            Volver
          </Link>
          <div className="space-y-2">
            <Chip
              className="!rounded-full bg-neutral-100 text-[#161d21]"
              variant="soft"
            >
              Admin
            </Chip>
            <h1 className="text-2xl font-black">Entrar al panel</h1>
            <p className="text-sm leading-6 text-neutral-600">
              Usa tu cuenta de administración para revisar campañas, donaciones
              y compras pendientes en Vendonar.
            </p>
          </div>
          <label className="field-label">
            Email
            <Input
              autoComplete="email"
              className="field"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
              variant="secondary"
            />
          </label>
          <label className="field-label">
            Contraseña
            <Input
              autoComplete="current-password"
              className="field"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
              variant="secondary"
            />
          </label>
          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            className="w-fit !rounded-full bg-[#2D5D5E] px-5 font-black text-[#FAE880]"
            isDisabled={isSubmitting}
            type="submit"
            variant="primary"
          >
            <LogIn size={18} />
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}
