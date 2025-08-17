import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas App",
  description: "App personal de finanzas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="p-4 border-b flex gap-4">
          <a className="underline" href="/">Inicio</a>
          <a className="underline" href="/accounts">Cuentas</a>
          <a className="underline" href="/transactions">Transacciones</a>
          <a className="underline" href="/transfers">Transferencias</a>
          <a className="underline" href="/budgets">Presupuestos</a>
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/auth">Login</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
