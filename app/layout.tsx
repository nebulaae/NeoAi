import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { Providers } from "@/components/layout/Providers";
import { BottomBar } from "@/components/layout/BottomBar";
import { AuthGuard } from "@/auth/AuthGuard";

export const metadata: Metadata = {
  title: "All AI",
  description: "AI Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className={GeistSans.className}>
        <Providers>
          <AuthGuard>
            <div className="app-shell">
              <main className="page-content">{children}</main>
              <BottomBar />
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}