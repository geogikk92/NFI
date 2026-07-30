"use client";

// Задача 6 — куизът.
//
// Един въпрос наведнъж: цял списък от осем въпроса отблъсква, а целта е
// човекът да стигне до края и до разговора.
//
// Достъпност:
//   • въпросът е <fieldset> с <legend> — четецът обявява питането преди
//     отговорите, което при radio група е задължително;
//   • смяната на въпрос се обявява през aria-live и фокусът отива на
//     новото питане — иначе човек с четец не разбира, че екранът се е сменил;
//   • фокусът НЕ се краде при първия рендер (guard `interacted`);
//   • прогресът е <progress> с текстов еквивалент, не само лента.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { progressPercent, type QuizQuestion } from "@/lib/cms/level-test";
import { cn } from "@/lib/utils";

interface LevelTestQuizProps {
  questions: readonly QuizQuestion[];
  /** Приема отговорите и пренасочва към резултата. */
  action: (formData: FormData) => Promise<void>;
}

export function LevelTestQuiz({ questions, action }: LevelTestQuizProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLLegendElement>(null);
  const interacted = useRef(false);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;
  const chosen = question ? answers[question.id] : undefined;
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (!interacted.current) return;
    headingRef.current?.focus();
  }, [index]);

  if (!question) {
    return (
      <p className="rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
        Der Test ist gerade nicht verfügbar. Bitte versuchen Sie es später.
      </p>
    );
  }

  function choose(optionId: string) {
    interacted.current = true;
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function go(delta: number) {
    interacted.current = true;
    setIndex((value) => Math.min(Math.max(value + delta, 0), total - 1));
  }

  return (
    <div>
      {/* Прогрес: и графично, и текстово. */}
      <div className="flex items-center gap-4">
        <progress
          value={index + 1}
          max={total}
          className="h-1.5 flex-1 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        >
          {progressPercent(index + 1, total)}%
        </progress>
        <p className="shrink-0 text-sm text-muted-foreground">
          Frage {index + 1} von {total}
        </p>
      </div>

      {/* Обявява смяната на въпроса. */}
      <p role="status" aria-live="polite" className="sr-only">
        Frage {index + 1} von {total}
      </p>

      <form action={action} className="mt-8">
        {/* Всички досегашни отговори пътуват с формуляра — точкуването е
            на сървъра, клиентът само събира избора. */}
        {Object.entries(answers).map(([questionId, optionId]) => (
          <input
            key={questionId}
            type="hidden"
            name={`answer:${questionId}`}
            value={optionId}
          />
        ))}

        <fieldset className="rounded-xl border border-border bg-card p-6">
          <legend
            ref={headingRef}
            tabIndex={-1}
            className="px-2 font-display text-xl leading-snug"
          >
            {question.prompt}
          </legend>

          <div className="mt-5 space-y-2">
            {question.options.map((option) => {
              const id = `${question.id}-${option.id}`;
              const active = chosen === option.id;

              return (
                <label
                  key={option.id}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                    active
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`q-${question.id}`}
                    value={option.id}
                    checked={active}
                    onChange={() => choose(option.id)}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            Zurück
          </Button>

          {isLast ? (
            <Button type="submit" size="lg" disabled={answeredCount === 0}>
              Ergebnis anzeigen
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={() => go(1)}>
              {chosen ? "Weiter" : "Überspringen"}
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            {answeredCount} von {total} beantwortet
          </p>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sie können Fragen überspringen — das Ergebnis wird dann grober.
          Der Test dauert etwa zehn Minuten und ist kostenlos.
        </p>
      </form>
    </div>
  );
}
