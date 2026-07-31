"use client";

// АДМИН · формата за продукт — създаване и редакция с един компонент.
//
// Три неща я различават от формата за курс, и трите са заради това, което
// човек не може да знае наум:
//
//   1. КОРИЦАТА СЕ ВИЖДА, ДОКАТО СЕ ПИШЕ. Учебните материали нямат снимки
//      — корицата е цветен блок с текст. Попълвана на сляпо, тя излиза
//      накриво чак в магазина, затова тук стои същият компонент, който
//      рисува и рафта: components/commerce/product-cover.tsx. Един
//      компонент, не два — второ копие би се разминало след първата
//      промяна по дизайна.
//
//   2. ТЕГЛОТО И НАЛИЧНОСТТА СЕ КРИЯТ ЗА ДИГИТАЛНИТЕ. Не се посивяват —
//      изчезват: празно поле с етикет „Тегло" върху PDF е въпрос без
//      отговор. Сървърът също ги занулява (виж parseProductForm), така че
//      скриването е удобство, не защита.
//
//   3. ДДС КАТЕГОРИЯТА ОБЯСНЯВА ИЗБРАНОТО. Тя не следва вида на продукта
//      и това бърка всички — затова под менюто стои какво значи точно
//      избраното, а не общо описание.

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
import { ProductCover, type CoverColor } from "@/components/commerce/product-cover";
import { Button } from "@/components/ui/button";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { PRODUCT_LIMITS } from "@/lib/admin/limits";
import { slugify } from "@/lib/admin/slug";

/**
 * Продуктът, както го подава страницата.
 *
 * Собствен тип, а не `AdminProductDetail`: онзи идва от модул с
 * „server-only" и внасянето му тук — дори само на типа — вкарва Prisma в
 * клиентския бъндъл и събаря екрана с 500. Вече се е случвало.
 */
export interface ProductFormValues {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  type: string;
  priceCents: number;
  vatCategory: string;
  weightGrams: number | null;
  stock: number | null;
  coverColor: string;
  coverBrand: string | null;
  coverEyebrow: string | null;
  coverTitle: string | null;
  coverMeta: string | null;
  published: boolean;
  sortOrder: number;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  types: readonly { value: string; label: string }[];
  vatCategories: readonly { value: string; label: string }[];
  /** Обяснението под менюто, по избрана категория. */
  vatHints: Record<string, string>;
  coverColors: readonly { value: string; label: string }[];
  product?: ProductFormValues;
}

/** Центове → „129,50". Низово, за да не мине през плаваща запетая. */
function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

function numberToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function ProductForm({
  action,
  types,
  vatCategories,
  vatHints,
  coverColors,
  product,
}: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const editing = Boolean(product);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  // ── Адресът ────────────────────────────────────────────────────────
  const [slug, setSlug] = useState(sent.slug ?? product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [title, setTitle] = useState(sent.title ?? product?.title ?? "");
  const [titleDe, setTitleDe] = useState(sent.titleDe ?? product?.titleDe ?? "");

  function suggest(nextTitle: string, nextTitleDe: string) {
    if (slugTouched) return;
    setSlug(slugify(nextTitleDe.trim() || nextTitle.trim()));
  }

  // ── Видът управлява какво се пита ──────────────────────────────────
  const [type, setType] = useState(sent.type ?? product?.type ?? "");
  const physical = type === "PHYSICAL";

  // ── ДДС категорията обяснява себе си ───────────────────────────────
  const [vat, setVat] = useState(sent.vatCategory ?? product?.vatCategory ?? "");

  // ── Корицата се рисува, докато се пише ─────────────────────────────
  const [cover, setCover] = useState({
    color: (sent.coverColor ?? product?.coverColor ?? "INK") as string,
    brand: sent.coverBrand ?? product?.coverBrand ?? "",
    eyebrow: sent.coverEyebrow ?? product?.coverEyebrow ?? "",
    title: sent.coverTitle ?? product?.coverTitle ?? "",
    meta: sent.coverMeta ?? product?.coverMeta ?? "",
  });

  const patchCover = (part: Partial<typeof cover>) =>
    setCover((current) => ({ ...current, ...part }));

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={product?.id ?? ""} />

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
          hint={`Най-много ${PRODUCT_LIMITS.title} знака.`}
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
          hint="Немският е основният език на магазина."
          onChange={(event) => {
            setTitleDe(event.target.value);
            suggest(title, event.target.value);
          }}
        />

        <TextField
          name="titleEn"
          label="Заглавие (английски)"
          defaultValue={sent.titleEn ?? product?.titleEn ?? ""}
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
              Появява се в връзката: <code>/de/shop/{slug || "…"}</code>.{" "}
              {editing
                ? "Смениш ли го, старата връзка спира да работи."
                : "Попълва се сам от немското заглавие."}
            </>
          }
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
        />

        <TextareaField
          name="description"
          label="Описание (български)"
          defaultValue={sent.description ?? product?.description ?? ""}
          error={errors.description}
        />
        <TextareaField
          name="descriptionDe"
          label="Описание (немски)"
          defaultValue={sent.descriptionDe ?? product?.descriptionDe ?? ""}
          error={errors.descriptionDe}
        />
        <TextareaField
          name="descriptionEn"
          label="Описание (английски)"
          defaultValue={sent.descriptionEn ?? product?.descriptionEn ?? ""}
          error={errors.descriptionEn}
        />
      </FieldGroup>

      <FieldGroup
        title="Цена и данък"
        description="Видът казва как стига до клиента. ДДС категорията казва как се облага — двете НЕ съвпадат и се избират поотделно."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="type"
            label="Вид"
            required
            options={types}
            placeholder="— избери —"
            defaultValue={type}
            error={errors.type}
            onValueChange={setType}
          />

          <TextField
            name="price"
            label="Цена"
            required
            inputMode="decimal"
            suffix="€"
            defaultValue={sent.price ?? centsToInput(product?.priceCents)}
            error={errors.priceCents}
            hint="С включено ДДС. Пиши „12,90“ — без разделител за хиляди."
          />
        </div>

        <SelectField
          name="vatCategory"
          label="ДДС категория"
          required
          options={vatCategories}
          placeholder="— избери —"
          defaultValue={vat}
          error={errors.vatCategory}
          onValueChange={setVat}
          hint={
            vatHints[vat] ??
            "Записан видеокурс и курс на живо са и двата дигитални, но се облагат различно. Избери според това КАК се доставя, не какъв е файлът."
          }
        />
      </FieldGroup>

      {/* Само за физическите. НЕ се посивява — изчезва: празно поле
          „Тегло" върху PDF е въпрос без отговор. */}
      {physical ? (
        <FieldGroup
          title="Доставка"
          description="Тези две полета важат само за физически продукти. Изберете ли „дигитален“, те се занулят при записа."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="weightGrams"
              label="Тегло"
              inputMode="numeric"
              suffix="г"
              defaultValue={
                sent.weightGrams ?? numberToInput(product?.weightGrams)
              }
              error={errors.weightGrams}
              hint="Използва се за сметката на доставката."
            />

            <TextField
              name="stock"
              label="Наличност"
              inputMode="numeric"
              suffix="бр."
              defaultValue={sent.stock ?? numberToInput(product?.stock)}
              error={errors.stock}
              hint="Празно значи „без следене на количество“. Нула значи „изчерпан“."
            />
          </div>
        </FieldGroup>
      ) : null}

      <FieldGroup
        title="Корица"
        description="Учебните материали нямат снимки — корицата е цветен блок с текст. Отдясно се вижда как ще изглежда в магазина."
      >
        <div className="grid gap-6 sm:grid-cols-[1fr_10rem]">
          <div className="grid gap-5">
            <SelectField
              name="coverColor"
              label="Цвят"
              required
              options={coverColors}
              defaultValue={cover.color}
              error={errors.coverColor}
              onValueChange={(value) => patchCover({ color: value })}
            />

            <TextField
              name="coverBrand"
              label="Линия най-горе"
              defaultValue={cover.brand}
              error={errors.coverBrand}
              hint="Например „NFI · Wortschatz“."
              onChange={(event) => patchCover({ brand: event.target.value })}
            />

            <TextField
              name="coverEyebrow"
              label="Надпис над заглавието"
              defaultValue={cover.eyebrow}
              error={errors.coverEyebrow}
              hint="Например „Verben“."
              onChange={(event) => patchCover({ eyebrow: event.target.value })}
            />

            <TextField
              name="coverTitle"
              label="Заглавие на корицата"
              defaultValue={cover.title}
              error={errors.coverTitle}
              hint="КРАТКА немска форма, различна от името на продукта — на корицата се събира малко. Празно значи, че се ползва заглавието на продукта."
              onChange={(event) => patchCover({ title: event.target.value })}
            />

            <TextField
              name="coverMeta"
              label="Ред най-долу"
              defaultValue={cover.meta}
              error={errors.coverMeta}
              hint="Например „500 Verben · A2–B2“."
              onChange={(event) => patchCover({ meta: event.target.value })}
            />
          </div>

          {/* Лепва се при превъртане, за да се вижда, докато се пише
              последното поле. */}
          <div className="sm:sticky sm:top-6 sm:self-start">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Така изглежда в магазина
            </p>
            <ProductCover
              color={cover.color as CoverColor}
              brand={cover.brand}
              eyebrow={cover.eyebrow}
              coverTitle={cover.title}
              meta={cover.meta}
              fallback={{ bg: title, de: titleDe }}
              // Изгледът е немски, защото магазинът е немски по начало.
              locale="de"
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Публикуване">
        <TextField
          name="sortOrder"
          label="Подредба"
          inputMode="numeric"
          defaultValue={sent.sortOrder ?? String(product?.sortOrder ?? 0)}
          error={errors.sortOrder}
          hint="По-малкото число излиза по-напред в магазина."
        />

        <CheckboxField
          name="published"
          label="Продавай продукта"
          defaultChecked={
            sent.published !== undefined
              ? sent.published === "on"
              : (product?.published ?? false)
          }
          error={errors.published}
          hint="Непубликуваният продукт не се вижда в магазина и не може да се сложи в количка."
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>
          {editing ? "Запази промените" : "Създай продукта"}
        </SubmitButton>

        <Button asChild variant="ghost">
          <Link href="/admin/produkti">Отказ</Link>
        </Button>
      </div>
    </form>
  );
}
