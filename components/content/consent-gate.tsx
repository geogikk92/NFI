// ТЕРИТОРИЯ НА БОБИ · задача 2c — реалното гейтване.
// Писано от Жоро, докато Боби е в отпуск.
//
// ТОВА е същината на изискването. Банерът е фасадата; гейтването е
// същността.
//
// Без съгласие тук НЕ се рендира <iframe> — не скрит, не с display:none,
// а изобщо липсващ в HTML-а. Скрит iframe пак прави заявка към Vimeo,
// Vimeo пак получава IP адреса на посетителя, и нарушението е налице,
// независимо че нищо не се вижда.
//
// Компонентът е сървърен: решението се чете от бисквитката на сървъра и
// маркупът тръгва вече изчистен.

import type { ReactNode } from "react";
import { Play, ShieldOff } from "lucide-react";
import { readConsent } from "@/lib/consent-cookie";
import { hasConsent, type ConsentCategory } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { acceptConsentCategory } from "@/app/(public)/consent-actions";

interface ConsentGateProps {
  category: Exclude<ConsentCategory, "necessary">;
  /** Кой доставчик — изписва се в заместителя, за да е информирано съгласието. */
  provider: string;
  /** Заглавие на съдържанието, за заместителя. */
  title?: string;
  children: ReactNode;
}

export async function ConsentGate({
  category,
  provider,
  title,
  children,
}: ConsentGateProps) {
  const consent = await readConsent();

  if (hasConsent(consent, category)) {
    return <>{children}</>;
  }

  return (
    <div className="not-prose flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken px-6 py-12 text-center">
      <span className="text-subtle" aria-hidden>
        <ShieldOff className="size-8" />
      </span>

      <p className="mt-4 font-medium">
        {title ? `„${title}" ist nicht geladen` : "Inhalt nicht geladen"}
      </p>

      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Dieser Inhalt kommt von {provider}. Beim Laden erhält {provider} Ihre
        IP-Adresse. Deshalb laden wir ihn erst, wenn Sie zustimmen.
      </p>

      {/* Формуляр, не onClick — работи и без JavaScript.
          Подава се КОНКРЕТНАТА категория: съгласието за едно видео не бива
          да включва статистиката. */}
      <form action={acceptConsentCategory} className="mt-6">
        <input type="hidden" name="category" value={category} />
        <Button type="submit" variant="outline">
          <Play aria-hidden />
          Laden und zustimmen
        </Button>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        Die Zustimmung gilt für externe Inhalte auf der gesamten Seite und
        ist unter{" "}
        <a href="/cookies" className="underline hover:text-primary">
          Cookie-Einstellungen
        </a>{" "}
        jederzeit widerrufbar.
      </p>
    </div>
  );
}
