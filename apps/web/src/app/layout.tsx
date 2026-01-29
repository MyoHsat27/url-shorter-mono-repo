import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "URLShort - Shorten Your URLs",
  description:
    "Create short, shareable links instantly. A modern URL shortener with a clean, minimal interface.",
  keywords: ["url shortener", "link shortener", "short urls", "tiny url"],
  authors: [{ name: "URLShort" }],
  openGraph: {
    title: "URLShort - Shorten Your URLs",
    description: "Create short, shareable links instantly.",
    type: "website",
  },
};

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
