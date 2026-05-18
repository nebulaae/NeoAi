/* app/(root)/layout.tsx */
import { BottomBar } from '@/components/layout/BottomBar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider open={false}>
        <AppSidebar />

        {/*
          page-content: на мобилке занимает весь экран без горизонтального overflow.
          На десктопе ограничиваем контент max-width'ом чтобы он не растягивался
          на весь широкий экран, но ограничение выглядит органично —
          просто через margin auto внутри самих страниц (max-w: 760px).
        */}
        <main
          className="page-content flex flex-col items-center"
          style={{
            /* Prevent any horizontal scroll leaking from children */
            overflowX: 'hidden',
            /* Ensure full viewport height for sticky headers etc. */
            minHeight: '100svh',
          }}
        >
          <div className="w-full max-w-2xl flex flex-col flex-1 pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))]">
            <AuthGuard>{children}</AuthGuard>
          </div>
        </main>

        <BottomBar />
      </SidebarProvider>
  );
}
