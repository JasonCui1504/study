import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "MCAT Study", template: "%s · MCAT Study" },
  description: "Flashcards, study plan and progress tracking for the MCAT.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "MCAT", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0d1110",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas font-sans text-prose antialiased">{children}</body>
    </html>
  );
}
