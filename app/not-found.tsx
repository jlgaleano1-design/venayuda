import { ErrorState, errorStateActions } from "@/components/error-state";
import { SiteFooter } from "@/components/site-footer";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#FFFCF8] px-6 py-10 text-[#2A3534]">
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          actions={[errorStateActions.campaigns, errorStateActions.home]}
          code="404"
          message="Puede que el enlace haya cambiado, que la campaña todavía no esté publicada o que ya no esté disponible."
          title="No encontramos esta página"
          variant="not-found"
        />
      </div>
      <SiteFooter />
    </main>
  );
}
