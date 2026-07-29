// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ЗАМРАЗЕН ФАЙЛ. Промяна само през PR с ревю от другия.                ║
// ║  Виж .github/CODEOWNERS.                                              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// И двата шрифта ЗАДЪЛЖИТЕЛНО носят кирилица и ä ö ü ß — половината
// съдържание е на български, другата на немски, и стоят едно до друго.
// Семействата ги избира Боби (задача 2a); имената на променливите са
// договорка и са в app/tokens.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Nürnberger Fremdsprachen Institut",
    template: "%s · NFI",
  },
  description:
    "Sprachkurse, Prüfungsvorbereitung und beglaubigte Übersetzungen in Nürnberg.",
  // Махни това чак в задача 22, заедно с останалите noindex.
  // Докато сайтът е в разработка, Google не бива да го вижда.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
