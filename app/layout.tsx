import type { Metadata, Viewport } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";

// Corpo: Inter. Títulos: Archivo (900 itálico = energia de cartaz desportivo WC26).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trocata — Troca de cromos Panini Mundial 2026",
  description:
    "Completa a tua caderneta do Mundial 2026 em grupo e perto de ti. Encontra 3 pessoas na tua zona e troca em segurança.",
};

export const viewport: Viewport = {
  themeColor: "#00A651",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${inter.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
