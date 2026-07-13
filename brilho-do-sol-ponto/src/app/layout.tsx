import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/PwaRegister";
import { PwaStatus } from "@/components/PwaStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brilho do Sol Ponto e RH",
  description: "Controle de ponto, RH e folha de pagamento do Brilho do Sol Supermercado.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo-brilho-do-sol.jpeg",
    apple: "/logo-brilho-do-sol.jpeg"
  }
};

export const viewport: Viewport = {
  themeColor: "#078d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        <PwaStatus />
        {children}
      </body>
    </html>
  );
}
