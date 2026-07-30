// Съобщение, когато базата липсва или не отговаря.
//
// НЕ е EmptyState: празното състояние казва „още няма курсове", което при
// счупен деплой е лъжа. Тук се казва истината, и то на два адресата
// наведнъж — посетителят вижда, че проблемът е у нас, а разработчикът
// вижда какво точно липсва.

import { AlertTriangle } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

const COPY: Record<
  Locale,
  { title: string; body: string; hint: string }
> = {
  bg: {
    title: "Съдържанието не може да се зареди",
    body: "Работим по това. Междувременно ни потърси — отговаряме и по телефона.",
    hint: "Настройка: липсва връзка към базата данни.",
  },
  de: {
    title: "Die Inhalte können nicht geladen werden",
    body: "Wir arbeiten daran. Melde dich in der Zwischenzeit bei uns — telefonisch sind wir erreichbar.",
    hint: "Konfiguration: keine Verbindung zur Datenbank.",
  },
  en: {
    title: "The content could not be loaded",
    body: "We're on it. In the meantime, get in touch — we're reachable by phone.",
    hint: "Configuration: no database connection.",
  },
};

export function DataUnavailable({
  locale,
  reason,
}: {
  locale: Locale;
  reason: "no-database" | "unreachable";
}) {
  const t = COPY[locale] ?? COPY.bg;

  return (
    <div
      role="alert"
      className="border-2 border-dashed border-warning bg-warning/10 px-6 py-12 text-center"
    >
      <span className="text-warning-foreground" aria-hidden>
        <AlertTriangle className="mx-auto size-8" />
      </span>
      <p className="mt-4 font-title text-xl font-bold">{t.title}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
        {t.body}
      </p>

      {/* Техническата причина се показва САМО извън продукция: на живия
          сайт тя не помага на посетителя, а издава подробности за
          настройката. В build лога тя така или иначе е налице. */}
      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-subtle">
          {t.hint} ({reason})
        </p>
      ) : null}
    </div>
  );
}
