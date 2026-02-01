import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { GenerationWizard } from "@/components/generation/generation-wizard";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sumi — Artistic Infographic Generator",
  description:
    "Create beautiful infographics in 126 artistic styles. AI-powered generation with accurate typography.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
          <GenerationWizard />
        </Providers>
      </body>
    </html>
  );
}
