import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FT Mixer & Emphasizer | Team 10",
  description: "Fourier Transform magnitude and phase mixing tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col bg-[#0d0a07] text-[#f5ede6] font-sans overflow-hidden">
        <header className="bg-[#1a1410] border-b border-[#3a2e24] py-2.5 px-5 flex items-center justify-between shadow-xl shrink-0">
          <h1 className="text-base font-bold tracking-widest uppercase text-[#f5ede6]">FT Mixer</h1>
          <div className="text-[10px] text-[#8a7a6a] font-mono bg-[#120e09] px-2.5 py-0.5 rounded border border-[#4a3c30]">Team 10</div>
        </header>
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
