import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Home,
  Info,
  LockKeyhole,
  Search,
} from "lucide-react";

type ErrorStateVariant =
  | "blocked"
  | "manual"
  | "not-found"
  | "system"
  | "warning";

type ErrorStateAction = {
  href: Route;
  icon?: ReactNode;
  label: string;
  tone?: "primary" | "secondary";
};

const variantStyles: Record<
  ErrorStateVariant,
  {
    accent: string;
    icon: ReactNode;
    label: string;
    panel: string;
  }
> = {
  blocked: {
    accent: "bg-red-50 text-red-700",
    icon: <LockKeyhole size={22} />,
    label: "Acceso",
    panel: "border-red-200 bg-red-50/70",
  },
  manual: {
    accent: "bg-sky-50 text-sky-800",
    icon: <Info size={22} />,
    label: "Revisión manual",
    panel: "border-sky-200 bg-sky-50/70",
  },
  "not-found": {
    accent: "bg-neutral-100 text-neutral-700",
    icon: <Search size={22} />,
    label: "No encontrado",
    panel: "border-neutral-200 bg-white/70",
  },
  system: {
    accent: "bg-red-50 text-red-700",
    icon: <AlertTriangle size={22} />,
    label: "Sistema",
    panel: "border-red-200 bg-red-50/70",
  },
  warning: {
    accent: "bg-amber-50 text-amber-800",
    icon: <AlertTriangle size={22} />,
    label: "Pendiente",
    panel: "border-amber-200 bg-amber-50/70",
  },
};

export function ErrorState({
  actions,
  children,
  code,
  codeLabel = "Código",
  eyebrow,
  message,
  title,
  variant = "system",
}: {
  actions?: ErrorStateAction[];
  children?: ReactNode;
  code?: string;
  codeLabel?: string;
  eyebrow?: string;
  message: string;
  title: string;
  variant?: ErrorStateVariant;
}) {
  const style = variantStyles[variant];

  return (
    <section
      className={`surface-card mx-auto w-full max-w-xl overflow-hidden ${style.panel}`}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${style.accent}`}
          >
            {style.icon}
          </span>
          <div className="min-w-0 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
              {eyebrow ?? style.label}
            </span>
            <h1 className="text-2xl font-black tracking-normal text-[#2A3534]">
              {title}
            </h1>
            <p className="leading-7 text-neutral-700">{message}</p>
          </div>
        </div>

        {children ? (
          <div className="rounded-[1.25rem] border border-black/5 bg-[#FFFCF8]/80 p-4 text-sm leading-6 text-neutral-700">
            {children}
          </div>
        ) : null}

        {actions?.length ? (
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                className={action.tone === "secondary" ? "btn-secondary" : "btn-primary"}
                href={action.href}
                key={`${action.href}-${action.label}`}
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}

        {code ? (
          <p className="text-xs font-bold text-neutral-500">
            {codeLabel}: {code}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const errorStateActions = {
  campaigns: { href: "/#campanas", icon: <Search size={18} />, label: "Ver campañas" },
  home: { href: "/", icon: <Home size={18} />, label: "Inicio", tone: "secondary" },
  backHome: { href: "/", icon: <ArrowLeft size={18} />, label: "Volver", tone: "secondary" },
  saved: {
    href: "/#campanas",
    icon: <CheckCircle2 size={18} />,
    label: "Ver campañas",
  },
} satisfies Record<string, ErrorStateAction>;
