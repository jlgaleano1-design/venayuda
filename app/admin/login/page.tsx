import { Suspense } from "react";
import { AdminLoginCard } from "@/components/admin-login-card";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFCF8] px-6 text-[#161d21]">
      <Suspense fallback={<LoginFallback />}>
        <AdminLoginCard />
      </Suspense>
    </main>
  );
}

function LoginFallback() {
  return (
    <div className="surface-card w-full max-w-md p-6">
      <p className="text-sm font-bold text-neutral-600">Cargando panel...</p>
    </div>
  );
}
