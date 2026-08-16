"use client";

// АДМИН · изборът на корица от медийната библиотека.
//
// НАТИВЕН `<select>`, не модален диалог с решетка от картинки: Radix
// диалогът работи само с JavaScript и при паднал скрипт не изпраща
// стойност, а изображенията са десетки, не хиляди — падащ списък е
// честният избор. Клиентски е само заради живата миниатюра на
// избраното: човек трябва да ВИДИ снимката, преди да натисне „Запази".
//
// Опциите идват от страницата като ПРОСТИ обекти — никакъв Prisma тип
// не пресича границата към клиентския бъндъл (виж course-form.tsx).

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface MediaOption {
  id: string;
  /** Заглавие или име на файла — каквото има. */
  label: string;
  /** Годината от ключа — за <optgroup>. */
  year: string;
  url: string;
  width: number | null;
  height: number | null;
  /** Описание за екранен четец — показва се като подсказка. */
  alt: string | null;
}

interface Props {
  /** Името на полето във FormData. */
  name: string;
  label: string;
  options: MediaOption[];
  defaultValue?: string;
  error?: string;
}

export function MediaField({ name, label, options, defaultValue, error }: Props) {
  // КОНТРОЛИРАН select — по същата причина като SelectField: React 19
  // прави form.reset() след server action и неконтролираният избор
  // изчезва от екрана, макар да е записан.
  const [value, setValue] = useState(defaultValue ?? "");
  const reactId = useId();
  const controlId = `${reactId}-control`;

  const selected = options.find((option) => option.id === value) ?? null;

  const byYear = new Map<string, MediaOption[]>();
  for (const option of options) {
    const list = byYear.get(option.year) ?? [];
    list.push(option);
    byYear.set(option.year, list);
  }

  return (
    <div className="grid gap-2">
      <label htmlFor={controlId} className="text-sm font-medium">
        {label}{" "}
        <span className="font-normal text-muted-foreground">(по желание)</span>
      </label>

      <div className="flex flex-wrap items-start gap-4">
        <select
          id={controlId}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${controlId}-error` : `${controlId}-hint`}
          className="min-w-56 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">— без снимка —</option>
          {[...byYear.entries()].map(([year, list]) => (
            <optgroup key={year} label={year}>
              {list.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selected ? (
          <Image
            src={selected.url}
            alt={selected.alt ?? ""}
            width={selected.width ?? 160}
            height={selected.height ?? 120}
            className="h-20 w-auto rounded-md border border-border"
            sizes="160px"
          />
        ) : null}
      </div>

      {error ? (
        <p id={`${controlId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${controlId}-hint`} className="text-sm text-muted-foreground">
          Снимките се качват в{" "}
          <Link href="/admin/mediya" className="underline underline-offset-4">
            Медия
          </Link>{" "}
          и после се избират оттук.
        </p>
      )}
    </div>
  );
}
