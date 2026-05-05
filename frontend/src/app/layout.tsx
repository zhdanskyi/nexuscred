import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "NexusCred — Decentralized Labor Reputation",
  description:
    "Sistema de reputación laboral descentralizado con credenciales criptográficas verificables. Plataforma de confianza para el ecosistema laboral del futuro.",
  keywords: ["credentials", "blockchain", "reputation", "decentralized", "labor"],
  authors: [{ name: "NexusCred" }],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black grain-overlay">
        {children}
      </body>
    </html>
  );
}
