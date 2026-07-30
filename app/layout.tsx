// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  ЗАМРАЗЕН ФАЙЛ. Промяна само през PR с ревю от другия.                ║
// ║  Виж .github/CODEOWNERS.                                              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import type { Metadata, Viewport } from "next";
import { Inter, Oswald, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { headers } from "next/headers";
import { LOCALE_TAGS, toLocale } from "@/lib/i18n/config";

// ВСИЧКИ шрифтове ЗАДЪЛЖИТЕЛНО носят кирилица и ä ö ü ß: сайтът е на
// български, а предметът е немски, и двете азбуки стоят едно до друго.
//
// Заместват системните шрифтове на мокъпа, които нямат надеждна кирилица
// в мрежата: Oswald ← Avenir Next Condensed, Inter ← Avenir Next,
// IBM Plex Mono ← SF Mono. Имената на променливите са договорка и са в
// app/tokens.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

// Тесният плакатен шрифт на заглавията — характерът на мокъпа.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

// Mono-то не е за код: мокъпът го ползва за kicker-ите и етикетите.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "NFI · Курсове по немски за българи в Германия",
    template: "%s · NFI",
  },
  description:
    "Курсове по немски A1–C1 на живо с Василена Нюрнбергер, за българи, които живеят и работят в Германия. Заверени преводи на документи.",
  // Махни това чак в задача 22, заедно с останалите noindex.
  // Докато сайтът е в разработка, Google не бива да го вижда.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Езикът идва от главата, която middleware.ts вече слага („x-nfi-locale").
  // Механизмът съществуваше, но никой не го четеше: тук стоеше твърдо
  // lang="bg" за ВСИЧКИ езици.
  //
  // Защо има значение, след като app/[locale]/layout.tsx слага езика на
  // <div>: този <div> обхваща тялото, но НЕ и <head>. Заглавието на
  // страницата — това, което екранният четец изговаря пръв и което се
  // чува в списъка с раздели — оставаше български за целия немски сайт.
  //
  // Резервната стойност е DEFAULT_LOCALE: /admin и страниците за грешка са
  // извън обхвата на middleware-а и са на български.
  const locale = toLocale((await headers()).get("x-nfi-locale"));

  return (
    // Шрифтовите променливи стоят на <html>, НЕ на <body>. Причината е
    // тънка и струваше цял ден с грешен шрифт: `--font-title` в
    // app/tokens.css е `var(--font-oswald), …` и се дефинира в `:root`.
    // Ако `--font-oswald` е на <body>, то при :root не съществува,
    // вложеният var() е невалиден и ЦЯЛАТА стойност става празна —
    // заглавията падат на Times, без никаква грешка в конзолата.
    <html
      lang={LOCALE_TAGS[locale]}
      suppressHydrationWarning
      className={`${inter.variable} ${oswald.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
