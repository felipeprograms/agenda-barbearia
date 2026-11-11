import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: { default: `${BRAND} | Agenda online para barbearias`, template: `%s | ${BRAND}` },
  description: "Agende seu horário na barbearia e garanta a vaga com Pix ou cartão.",
  applicationName: BRAND,
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Rozha+One&display=swap"
        />
      </head>
      <body>
        <div className="pole" aria-hidden="true" />
        <main>{children}</main>
        <PwaRegister />
      </body>
    </html>
  );
}
