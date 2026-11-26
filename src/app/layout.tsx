import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 동네 이웃 장학금 룰렛",
  description: "꽝 없이 100% 당첨! 사회복지사 장학금 룰렛 — 최대 75% 추가 장학 혜택",
  openGraph: {
    title: "우리 동네 이웃 장학금 룰렛",
    description: "꽝 없이 100% 당첨! 사회복지사 장학금 룰렛 — 최대 75% 추가 장학 혜택",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2469FF",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
