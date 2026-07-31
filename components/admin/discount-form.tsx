"use client";

// АДМИН · формата за промоционален код.
//
// Две неща я различават от другите две форми:
//
//   1. КОДЪТ СЕ ПОКАЗВА ТАКЪВ, КАКЪВТО ЩЕ БЪДЕ ЗАПИСАН. Пишеш „leto 2026",
//      в полето става „LETO2026". Не е разкрасяване: касата търси с
//      `.toUpperCase()`, тоест код с малки букви не може да бъде намерен
//      никога. Показването на място спестява „защо не работи?" по-късно.
//
//   2. СТОЙНОСТТА СЕ ПИТА ПО РАЗЛИЧЕН НАЧИН СПОРЕД ВИДА. Процентът и
//      сумата са две РАЗЛИЧНИ полета, не едно споделено. Ако бяха едно,
//      смяната на вида би оставила старото число с ново значение — 10 €
//      отстъпка тихо става 10%.

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CheckboxField,
  FieldGroup,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { Button } from "@/components/ui/button";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { toDateInputValue } from "@/lib/admin/input";
import { MAX_CODE_LENGTH, normalizeCode } from "@/lib/admin/discount-code";

export interface DiscountFormValues {
  id: string;
  code: string;
  kind: string;
  value: number;
  minOrderCents: number | null;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  kinds: readonly { value: string; label: string }[];
  discount?: DiscountFormValues;
}

function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

function numberToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function DiscountForm({ action, kinds, discount }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const editing = Boolean(discount);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [code, setCode] = useState(sent.code ?? discount?.code ?? "");
  const [kind, setKind] = useState(sent.kind ?? discount?.kind ?? "");
  const percent = kind === "PERCENT";
  const fixed = kind === "FIXED";

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={discount?.id ?? ""} />

      <FormStatus state={state} />

      <FieldGroup title="Код">
        <TextField
          name="code"
          label="Код за въвеждане от клиента"
          required
          value={code}
          error={errors.code}
          autoComplete="off"
          hint={
            <>
              Само латински букви и цифри. Записва се с ГЛАВНИ букви и без
              интервали — клиентът може да го напише както иска.{" "}
              <strong>Кирилицата не става:</strong> „С“ и „C“ изглеждат
              еднакво, но клиент в Германия не може да набере първото.
              Най-много {MAX_CODE_LENGTH} знака.
            </>
          }
          // Показва веднага какво ще бъде записано. Едно и също правило за
          // браузъра и за сървъра — една функция, не две.
          onChange={(event) => setCode(normalizeCode(event.target.value))}
        />
      </FieldGroup>

      <FieldGroup
        title="Отстъпка"
        description="Изберете вида първо — според него се пита или процент, или сума."
      >
        <SelectField
          name="kind"
          label="Вид отстъпка"
          required
          options={kinds}
          placeholder="— избери —"
          defaultValue={kind}
          error={errors.kind}
          onValueChange={setKind}
        />

        {/* Две РАЗЛИЧНИ полета, не едно споделено: смяната на вида не бива
            да оставя старото число с ново значение. */}
        {percent ? (
          <TextField
            name="percent"
            label="Процент"
            required
            inputMode="numeric"
            suffix="%"
            defaultValue={
              sent.percent ??
              (discount?.kind === "PERCENT" ? String(discount.value) : "")
            }
            error={errors.value}
            hint="Цяло число от 1 до 100. 100% значи безплатна поръчка."
          />
        ) : null}

        {fixed ? (
          <TextField
            name="amount"
            label="Сума на отстъпката"
            required
            inputMode="decimal"
            suffix="€"
            defaultValue={
              sent.amount ??
              (discount?.kind === "FIXED" ? centsToInput(discount.value) : "")
            }
            error={errors.value}
            hint="Приспада се от сумата на поръчката. Отстъпка над стойността ѝ я нулира, не я прави отрицателна."
          />
        ) : null}

        <TextField
          name="minOrder"
          label="Минимална поръчка"
          inputMode="decimal"
          suffix="€"
          defaultValue={
            sent.minOrder ?? centsToInput(discount?.minOrderCents)
          }
          error={errors.minOrderCents}
          hint="Празно значи „без минимум“. Кодът не важи за поръчки под тази сума."
        />
      </FieldGroup>

      <FieldGroup
        title="Срок и лимит"
        description="Празните полета значат „без ограничение“."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="startsAt"
            label="Важи от"
            type="date"
            defaultValue={
              sent.startsAt ?? toDateInputValue(discount?.startsAt ?? null)
            }
            error={errors.startsAt}
            hint="От началото на този ден."
          />

          <TextField
            name="endsAt"
            label="Важи до"
            type="date"
            defaultValue={
              sent.endsAt ?? toDateInputValue(discount?.endsAt ?? null)
            }
            error={errors.endsAt}
            // Точката, заради която датите се смятат в часовата зона на
            // сайта, а не в UTC — виж parseDateEnd в lib/admin/input.ts.
            hint="ВКЛЮЧИТЕЛНО този ден, до 23:59 немско време."
          />
        </div>

        <TextField
          name="maxRedemptions"
          label="Максимум използвания"
          inputMode="numeric"
          suffix="бр."
          defaultValue={
            sent.maxRedemptions ?? numberToInput(discount?.maxRedemptions)
          }
          error={errors.maxRedemptions}
          hint="Празно значи неограничено. Броенето е общо, не на клиент."
        />

        {editing ? (
          // Броячът се ЧЕТЕ, не се пише: вдига се при плащане, а поле във
          // формата би позволило един невнимателен запис да го нулира и
          // изчерпаният код да тръгне отначало.
          <p className="text-sm text-muted-foreground">
            Използвана до момента:{" "}
            <strong className="text-foreground tabular-nums">
              {discount?.redemptions ?? 0}
            </strong>{" "}
            пъти. Броячът се вдига при плащане и не се редактира оттук.
          </p>
        ) : null}
      </FieldGroup>

      <FieldGroup title="Състояние">
        <CheckboxField
          name="active"
          label="Кодът работи"
          defaultChecked={
            sent.active !== undefined
              ? sent.active === "on"
              : (discount?.active ?? true)
          }
          error={errors.active}
          hint="Изключеният код се отхвърля на касата, но остава в списъка и в историята на поръчките."
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>
          {editing ? "Запази промените" : "Създай промоцията"}
        </SubmitButton>

        <Button asChild variant="ghost">
          <Link href="/admin/promocii">Отказ</Link>
        </Button>
      </div>
    </form>
  );
}
