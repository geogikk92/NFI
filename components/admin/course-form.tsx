"use client";

// АДМИН · формата за курс — създаване и редакция с един компонент.
//
// Клиентски е заради две неща и нищо друго:
//   1. useActionState — грешките се показват без презареждане;
//   2. предложението за адрес, докато се пише заглавието.
//
// Без JavaScript формата пак работи изцяло: действието е server action, а
// полетата са нативни. Тогава адресът се попълва на ръка — затова полето
// не е скрито и не е само за четене.

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CheckboxField,
  FieldGroup,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { Button } from "@/components/ui/button";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
// От lib/admin/limits, а НЕ от lib/admin/courses: вторият е „server-only"
// и води до Prisma — внесен оттук, събаря целия екран с 500. Виж главата
// на limits.ts.
import { COURSE_LIMITS } from "@/lib/admin/limits";
import { slugify } from "@/lib/admin/slug";
import { toDateInputValue } from "@/lib/admin/input";

/**
 * Курсът, както го подава страницата.
 *
 * Собствен тип, а не `AdminCourseDetail`: онзи идва от модул с
 * „server-only" и внасянето му тук — дори само на типа — вкарва Prisma в
 * графа на клиентския бъндъл.
 */
export interface CourseFormValues {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  level: string;
  format: string;
  summary: string | null;
  summaryDe: string | null;
  summaryEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  priceCents: number | null;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  maxParticipants: number | null;
  startsAt: Date | null;
  published: boolean;
  sortOrder: number;
}

interface Props {
  action: (
    prev: AdminFormState,
    data: FormData,
  ) => Promise<AdminFormState>;
  levels: readonly { value: string; label: string }[];
  formats: readonly { value: string; label: string }[];
  /** Липсва при създаване. */
  course?: CourseFormValues;
}

/**
 * Центове → това, което човек очаква да види в полето.
 *
 * Не minorUnits/100 с плаваща запетая: 12950 / 100 дава 129.5, а полето
 * трябва да покаже „129,50". Затова се реже низово.
 */
function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

function numberToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function CourseForm({ action, levels, formats, course }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const editing = Boolean(course);

  const errors = state.fieldErrors ?? {};
  // При изпращане без JavaScript страницата се презарежда и полетата се
  // пълнят оттук. С JavaScript компонентът не се пресъздава и въведеното
  // си стои в DOM-а — затова стойността е само резервна.
  const sent = state.values ?? {};

  // ── Предложението за адрес ──────────────────────────────────────────
  // Адресът следва НЕМСКОТО заглавие (така са и досегашните:
  // „deutsch-a1-abendkurs"), а при липсващо немско — българското.
  //
  // Пипне ли го човек веднъж, предложението спира завинаги: адресът е URL
  // и пренаписването му под пръстите на редактора е точно начинът да се
  // счупи връзка, която някой вече е пуснал в реклама.
  const [slug, setSlug] = useState(sent.slug ?? course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [titleDe, setTitleDe] = useState(
    sent.titleDe ?? course?.titleDe ?? "",
  );
  const [title, setTitle] = useState(sent.title ?? course?.title ?? "");

  function suggest(nextTitle: string, nextTitleDe: string) {
    if (slugTouched) return;
    setSlug(slugify(nextTitleDe.trim() || nextTitle.trim()));
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {/* Празно при създаване — действието различава двата случая по него. */}
      <input type="hidden" name="id" value={course?.id ?? ""} />

      <FormStatus state={state} />

      <FieldGroup
        title="Основно"
        description="Заглавието на български се въвежда винаги — то е резервният вариант, когато превод липсва."
      >
        <TextField
          name="title"
          label="Заглавие (български)"
          required
          defaultValue={title}
          error={errors.title}
          hint={`Най-много ${COURSE_LIMITS.title} знака.`}
          // Неконтролирано поле СЪС слушател: стойността живее в DOM-а, а
          // `onChange` само храни предложението за адрес. Пълно контролиране
          // тук би загубило написаното при връщане на грешка без JavaScript.
          onChange={(event) => {
            setTitle(event.target.value);
            suggest(event.target.value, titleDe);
          }}
        />

        <TextField
          name="titleDe"
          label="Заглавие (немски)"
          defaultValue={titleDe}
          error={errors.titleDe}
          hint="Немският е основният език на сайта. Липсва ли, посетителят вижда българското заглавие."
          onChange={(event) => {
            setTitleDe(event.target.value);
            suggest(title, event.target.value);
          }}
        />

        <TextField
          name="titleEn"
          label="Заглавие (английски)"
          defaultValue={sent.titleEn ?? course?.titleEn ?? ""}
          error={errors.titleEn}
        />

        <TextField
          name="slug"
          label="Адрес на страницата"
          required
          value={slug}
          error={errors.slug}
          hint={
            <>
              Появява се в връзката: <code>/de/kurse/{slug || "…"}</code>. Само
              малки латински букви, цифри и тире.{" "}
              {editing
                ? "Смениш ли го, старата връзка спира да работи — не го пипай, ако курсът вече е публикуван."
                : "Попълва се сам от немското заглавие."}
            </>
          }
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="level"
            label="Ниво"
            required
            options={levels}
            placeholder="— избери —"
            defaultValue={sent.level ?? course?.level ?? ""}
            error={errors.level}
          />

          <SelectField
            name="format"
            label="Формат"
            required
            options={formats}
            placeholder="— избери —"
            defaultValue={sent.format ?? course?.format ?? ""}
            error={errors.format}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Текстове"
        description="Краткото описание се показва в картата на курса, дългото — на страницата му. Празен ред между абзаците прави нов абзац."
      >
        <TextField
          name="summary"
          label="Кратко описание (български)"
          defaultValue={sent.summary ?? course?.summary ?? ""}
          error={errors.summary}
        />
        <TextField
          name="summaryDe"
          label="Кратко описание (немски)"
          defaultValue={sent.summaryDe ?? course?.summaryDe ?? ""}
          error={errors.summaryDe}
        />
        <TextField
          name="summaryEn"
          label="Кратко описание (английски)"
          defaultValue={sent.summaryEn ?? course?.summaryEn ?? ""}
          error={errors.summaryEn}
        />

        <TextareaField
          name="description"
          label="Описание (български)"
          defaultValue={sent.description ?? course?.description ?? ""}
          error={errors.description}
        />
        <TextareaField
          name="descriptionDe"
          label="Описание (немски)"
          defaultValue={sent.descriptionDe ?? course?.descriptionDe ?? ""}
          error={errors.descriptionDe}
        />
        <TextareaField
          name="descriptionEn"
          label="Описание (английски)"
          defaultValue={sent.descriptionEn ?? course?.descriptionEn ?? ""}
          error={errors.descriptionEn}
        />
      </FieldGroup>

      <FieldGroup
        title="Организация"
        description="Всичко тук е по желание. Празната цена значи „по договаряне“ и така се показва на сайта."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="price"
            label="Цена"
            inputMode="decimal"
            suffix="€"
            defaultValue={
              sent.price ?? centsToInput(course?.priceCents ?? null)
            }
            error={errors.priceCents}
            hint="С включено ДДС. Пиши „129,50“ — без разделител за хиляди."
          />

          <TextField
            name="startsAt"
            label="Начало"
            type="date"
            defaultValue={
              sent.startsAt ?? toDateInputValue(course?.startsAt ?? null)
            }
            error={errors.startsAt}
          />

          <TextField
            name="durationWeeks"
            label="Продължителност"
            inputMode="numeric"
            suffix="седм."
            defaultValue={
              sent.durationWeeks ?? numberToInput(course?.durationWeeks)
            }
            error={errors.durationWeeks}
          />

          <TextField
            name="hoursPerWeek"
            label="Часа седмично"
            inputMode="numeric"
            suffix="ч."
            defaultValue={
              sent.hoursPerWeek ?? numberToInput(course?.hoursPerWeek)
            }
            error={errors.hoursPerWeek}
          />

          <TextField
            name="maxParticipants"
            label="Максимум курсисти"
            inputMode="numeric"
            defaultValue={
              sent.maxParticipants ?? numberToInput(course?.maxParticipants)
            }
            error={errors.maxParticipants}
          />

          <TextField
            name="sortOrder"
            label="Подредба"
            inputMode="numeric"
            defaultValue={sent.sortOrder ?? String(course?.sortOrder ?? 0)}
            error={errors.sortOrder}
            hint="По-малкото число излиза по-напред в списъка."
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Публикуване">
        <CheckboxField
          name="published"
          label="Показвай курса на сайта"
          defaultChecked={
            sent.published !== undefined
              ? sent.published === "on"
              : (course?.published ?? false)
          }
          error={errors.published}
          hint="Непубликуваният курс се вижда само тук. Датата на публикуване се записва при първото включване и не се променя после."
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>
          {editing ? "Запази промените" : "Създай курса"}
        </SubmitButton>

        <Button asChild variant="ghost">
          <Link href="/admin/kursove">Отказ</Link>
        </Button>
      </div>
    </form>
  );
}
