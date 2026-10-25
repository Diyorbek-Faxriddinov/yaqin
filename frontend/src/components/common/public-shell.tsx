import { BottomNav } from "./bottom-nav";
import { DemoBanner } from "./demo-banner";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Ommaviy sahifalar karkasi. Telefonda pastki navigatsiya uchun joy footer ichida
 * qoldiriladi (qarang: SiteFooter).
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DemoBanner />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
