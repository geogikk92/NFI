"use client";

// АДМИН · формата за безплатен материал — създаване и редакция.
// Устроена като course-form.tsx: useActionState + предложение за адрес.
// Полетата за файл/видео се показват СПОРЕД вида — човек не бива да
// гадае кое от двете празни полета е неговото.

import { useActionState, useState } from "react";
import {
  CheckboxField,
  FieldGroup,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { slugify } from "@/lib/admin/slug";

export interface MaterialFormValues {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  kind: string;
  storageKey: string | null;
  externalId: string | null;
  level: string | null;
  published: boolean;
  sortOrder: number;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  kinds: readonly { value: string; label: string }[];
  levels: readonly { value: string; label: string }[];
  material?: MaterialFormValues;
}

export function MaterialForm({ action, kinds, levels, material }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const editing = Boolean(material);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [slug, setSlug] = useState(sent.slug ?? material?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [kind, setKind] = useState(sent.kind ?? material?.kind ?? "PDF");

  const needsFile = kind === "PDF" || kind === "AUDIO";

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={material?.id ?? ""} />

      <FormStatus state={state} />

      <FieldGroup
        title="Основно"
        description="Заглавието на български се въвежда винаги — то е резервният вариант при липсващ превод."
      >
        <TextField
          name="title"
          label="Заглавие (български)"
          required
          defaultValue={sent.title ?? material?.title ?? ""}
          error={errors.title}
          onChange={(event) => {
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
        <TextField
          name="titleDe"
          label="Заглавие (немски)"
          defaultValue={sent.titleDe ?? material?.titleDe ?? ""}
          error={errors.titleDe}
        />
        <TextField
          name="titleEn"
          label="Заглавие (английски)"
          defaultValue={sent.titleEn ?? material?.titleEn ?? ""}
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
              Появява се в връзката: <code>/bg/materialien/{slug || "…"}</code>.
              {editing
                ? " Смениш ли го, старата връзка спира да работи."
                : " Попълва се сам от заглавието."}
            </>
          }
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="kind"
            label="Вид"
            required
            options={kinds}
            defaultValue={kind}
            error={errors.kind}
            onValueChange={setKind}
          />
          <SelectField
            name="level"
            label="Ниво"
            options={[{ value: "", label: "За всички нива" }, ...levels]}
            defaultValue={sent.level ?? material?.level ?? ""}
            error={errors.level}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Съдържание"
        description={
          needsFile
            ? "PDF и аудио живеят в хранилището — ключът идва от качването (или от Жоро, докато качването получи интерфейс)."
            : "Видеата се вграждат от Vimeo; записите от GoTo са външна връзка."
        }
      >
        {needsFile ? (
          <TextField
            name="storageKey"
            label="Ключ в хранилището"
            required
            defaultValue={sent.storageKey ?? material?.storageKey ?? ""}
            error={errors.storageKey}
            hint="Например: media/2026/der-die-das-tablitza.pdf"
          />
        ) : (
          <TextField
            name="externalId"
            label={kind === "VIDEO_VIMEO" ? "Vimeo ID" : "Адрес / идентификатор"}
            required
            defaultValue={sent.externalId ?? material?.externalId ?? ""}
            error={errors.externalId}
            hint={
              kind === "VIDEO_VIMEO"
                ? "Само цифрите от адреса: vimeo.com/76979871 → 76979871"
                : "Пълен адрес, започващ с https://"
            }
          />
        )}
        {/* Скритото поле пази стойността на НЕактивния вариант — иначе
            смяната на вида в движение я губи. */}
        {needsFile ? (
          <input
            type="hidden"
            name="externalId"
            value={sent.externalId ?? material?.externalId ?? ""}
          />
        ) : (
          <input
            type="hidden"
            name="storageKey"
            value={sent.storageKey ?? material?.storageKey ?? ""}
          />
        )}

        <TextareaField
          name="description"
          label="Описание (български)"
          rows={3}
          defaultValue={sent.description ?? material?.description ?? ""}
          error={errors.description}
        />
        <TextareaField
          name="descriptionDe"
          label="Описание (немски)"
          rows={3}
          defaultValue={sent.descriptionDe ?? material?.descriptionDe ?? ""}
          error={errors.descriptionDe}
        />
        <TextareaField
          name="descriptionEn"
          label="Описание (английски)"
          rows={3}
          defaultValue={sent.descriptionEn ?? material?.descriptionEn ?? ""}
          error={errors.descriptionEn}
        />
      </FieldGroup>

      <FieldGroup title="Публикуване">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="sortOrder"
            label="Подредба"
            defaultValue={String(sent.sortOrder ?? material?.sortOrder ?? 0)}
            error={errors.sortOrder}
            hint="По-малкото число излиза по-напред."
          />
          <CheckboxField
            name="published"
            label="Публикуван"
            defaultChecked={
              sent.published !== undefined
                ? sent.published === "on"
                : (material?.published ?? false)
            }
            hint="Непубликуваният материал се вижда само тук."
          />
        </div>
      </FieldGroup>

      <div className="flex items-center gap-4">
        <SubmitButton>
          {editing ? "Запази промените" : "Създай материала"}
        </SubmitButton>
      </div>
    </form>
  );
}
