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

      {/* Фон приложения: статичные радиальные орбы в фирменном синем.
          Живёт здесь, а не внутри страниц, чтобы затягивать всё окно —
          включая полосу за сайдбаром — и быть одинаковым на всех экранах.
          Орбы намеренно не анимированы: перерисовка огромных размытых
          поверхностей каждый кадр заметно лагает на телефонах. */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-24 w-[620px] h-[620px] rounded-full bg-[#007AFF]/12 blur-[130px]" />
        <div className="absolute top-1/4 -right-32 w-[520px] h-[520px] rounded-full bg-[#0A84FF]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[460px] h-[460px] rounded-full bg-indigo-500/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,122,255,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25),#000_72%)]" />
      </div>

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
        <div className="w-full max-w-2xl flex flex-col flex-1 pb-[calc(80px+max(16px,var(--sa-bottom)))]">
          <AuthGuard>{children}</AuthGuard>
        </div>
      </main>

      <BottomBar />
    </SidebarProvider>
  );
}
