import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrivacyNotice } from "@/components/site/PrivacyNotice";
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
  title: "Capítulo Professor Carvalho Neves Nº 500",
  description: "Portal institucional e sistema integrado de gestão",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PrivacyNotice />
      </body>
    </html>
  );
}
