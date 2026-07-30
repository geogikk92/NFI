"use client";

// Последната мрежа: грешка в САМИЯ root layout.
//
// app/error.tsx се рендира ВЪТРЕ в root layout-а. Счупи ли се той —
// например заради шрифтовете или заради нещо в <head> — error.tsx няма
// къде да се покаже. Затова този файл носи собствени <html> и <body>.
//
// Стиловете са вградени, а не през класове: ако билдът на CSS е причината
// за грешката, класовете не значат нищо. Тази страница трябва да работи и
// когато нищо друго не работи.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bg">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#f7f5f0",
          color: "#16130f",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          {/* Флаг-линията, нарисувана без CSS файл. */}
          <div
            aria-hidden
            style={{
              height: 4,
              width: 80,
              background:
                "linear-gradient(90deg,#c11f2f 0 33%,#0f7a4d 33% 66%,#16130f 66% 100%)",
            }}
          />

          <h1 style={{ fontSize: "1.75rem", margin: "1.5rem 0 0" }}>
            Сайтът е временно недостъпен
          </h1>
          <p style={{ margin: "1rem 0 0", lineHeight: 1.6 }}>
            Проблемът е у нас. Опитай пак след няколко минути.
          </p>
          <p lang="de" style={{ margin: "0.5rem 0 0", lineHeight: 1.6, color: "#5c554c" }}>
            Der Fehler liegt bei uns. Bitte versuchen Sie es in ein paar Minuten
            noch einmal.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.6rem 1.25rem",
              border: "2px solid #16130f",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Опитай пак
          </button>

          {error.digest ? (
            <p
              style={{
                marginTop: "2rem",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#5c554c",
              }}
            >
              Код за поддръжка: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
