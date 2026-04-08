
import { BottomBar } from '@/components/layout/BottomBar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider open={false}>
        <AppSidebar />
        {/* Page content with left padding for sidebar on desktop */}
        <main className="page-content">
          {children}
        </main>
        <BottomBar />
      </SidebarProvider>
    </AuthGuard>
  );
}