"use client";

// АДМИН · основа — полетата на формите.
//
// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО "use client" — открито с тест, не по учебник
// ─────────────────────────────────────────────────────────────────────────
// Първата версия беше без директива: компонентите нямаха хук и можеха да
// живеят и от двете страни. После e2e тестът показа следното:
//
//   попълваш формата → грешиш цената → изпращаш → цената дава грешка,
//   НО ПАДАЩИТЕ МЕНЮТА „Ниво" и „Формат" се изпразват,
//
// тоест поправяш едно поле и получаваш две нови грешки. Причината е на
// границата между React и HTML:
//
//   1. React 19 НУЛИРА формата, след като server action приключи —
//      `form.reset()`, за да е чиста за следващото попълване;
//   2. нативният reset на `<select>` връща опцията с атрибут `selected`;
//   3. React не изписва такъв атрибут — той задава избора през свойството
//      `value` на елемента, а него reset-ът не гледа.
//
// Резултат: менюто пада на ПЪРВАТА опция, тоест на „— избери —".
// Текстовите полета оцеляват, защото при тях `defaultValue` наистина е
// HTML атрибут и reset-ът го намира.
//
// Единственото надеждно лекарство е менюто да пази избора си само —
// контролирано поле, което React налага наново при всяко рисуване. Оттам
// идва `useState`, а оттам и директивата. Същото важи и за отметката:
// нейният reset връща началното състояние, не избраното от човека.

// ЗАЩО ИЗОБЩО СЪЩЕСТВУВАТ
// ───────────────────────
// Четирите екрана имат общо над седемдесет полета. Написани поединично,
// както в components/content/register-form.tsx, това са седемдесет ръчно
// свързани двойки `aria-describedby` / `id` — и достатъчно е ЕДНА да се
// разпише грешно, за да остане поле, чиято грешка екранният четец никога
// не изговаря. Тук връзката се прави веднъж и не може да се сгреши:
// идентификаторите се извеждат от `name`.
//
// Достъпност (WCAG 2.1 AA — правно задължение от 28.06.2025):
//   • истински <label>, не placeholder вместо етикет (3.3.2);
//   • грешката е ТЕКСТ, свързан с полето, не само червена рамка (1.4.1, 3.3.1);
//   • aria-invalid върху сгрешеното поле;
//   • задължителността се вижда и се чува — звездичка за окото, думата
//     „задължително" за четеца.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Общото за всяко поле. `name` е и името във FormData, и коренът на
 * идентификаторите — така полето, грешката и подсказката не могат да се
 * разминат.
 */
interface BaseProps {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

const CONTROL =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base " +
  "transition-colors outline-none placeholder:text-muted-foreground " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 " +
  "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 " +
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 " +
  "md:text-sm";

/** Идентификаторите на едно поле — изведени, не подадени. */
function ids(name: string) {
  const base = `f-${name}`;
  return { control: base, error: `${base}-error`, hint: `${base}-hint` };
}

/**
 * Кои описания да чуе четецът и в какъв ред.
 *
 * Грешката е ПЪРВА: тя е новината. Подсказката („най-много 200 знака")
 * идва след нея като контекст.
 */
function describedBy(
  name: string,
  { hasHint, hasError }: { hasHint: boolean; hasError: boolean },
): string | undefined {
  const { error, hint } = ids(name);
  const parts = [hasError ? error : null, hasHint ? hint : null].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function FieldFrame({
  name,
  label,
  hint,
  error,
  required,
  className,
  children,
}: BaseProps & { children: ReactNode }) {
  const { control, error: errorId, hint: hintId } = ids(name);

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={control} className="text-sm font-medium">
        {label}{" "}
        {required ? (
          <>
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">(задължително)</span>
          </>
        ) : (
          <span className="font-normal text-muted-foreground">
            (по желание)
          </span>
        )}
      </label>

      {children}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Едноредов текст, число, дата
// ─────────────────────────────────────────────────────────────────────────

interface TextFieldProps extends BaseProps {
  defaultValue?: string;
  /**
   * Само за полета, чиято стойност се управлява отвън (адресът, който се
   * попълва от заглавието). Подава се БЕЗ `defaultValue` — React се оплаква
   * от поле, което е и контролирано, и не.
   */
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  type?: "text" | "date" | "email" | "url";
  placeholder?: string;
  /**
   * Пример как изглежда правилната стойност — рисува се ВДЯСНО в самото
   * поле, а не като placeholder: placeholder-ът изчезва щом човек започне
   * да пише, тоест го няма точно докато трябва.
   */
  suffix?: string;
  inputMode?: "text" | "numeric" | "decimal";
  autoComplete?: string;
  readOnly?: boolean;
}

export function TextField({
  defaultValue,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
  inputMode,
  autoComplete,
  readOnly,
  ...base
}: TextFieldProps) {
  const { control } = ids(base.name);

  return (
    <FieldFrame {...base}>
      <div className="relative">
        <input
          id={control}
          name={base.name}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          defaultValue={value === undefined ? defaultValue : undefined}
          aria-invalid={base.error ? true : undefined}
          aria-describedby={describedBy(base.name, {
            hasHint: Boolean(base.hint),
            hasError: Boolean(base.error),
          })}
          className={cn(CONTROL, suffix && "pr-10", readOnly && "bg-muted/40")}
        />
        {suffix ? (
          // aria-hidden: мерната единица е в етикета или в подсказката,
          // а прочетена и тук би се чула два пъти.
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Многоредов текст
// ─────────────────────────────────────────────────────────────────────────

interface TextareaFieldProps extends BaseProps {
  defaultValue?: string;
  rows?: number;
  /**
   * Известява формата за всяка промяна, БЕЗ да отнема стойността на
   * полето (то си остава неконтролирано с `defaultValue`).
   *
   * Нужно е за брояча на знаци при редактора на текстове: човек трябва да
   * вижда колко му остава ДОКАТО пише, а не след „Запази". Името е като
   * при SelectField — една конвенция за целия файл.
   */
  onValueChange?: (value: string) => void;
}

export function TextareaField({
  defaultValue,
  rows = 5,
  onValueChange,
  ...base
}: TextareaFieldProps) {
  const { control } = ids(base.name);

  return (
    <FieldFrame {...base}>
      <textarea
        id={control}
        name={base.name}
        rows={rows}
        defaultValue={defaultValue}
        onChange={
          onValueChange
            ? (event) => onValueChange(event.target.value)
            : undefined
        }
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.name, {
          hasHint: Boolean(base.hint),
          hasError: Boolean(base.error),
        })}
        className={cn(CONTROL, "field-sizing-content min-h-24")}
      />
    </FieldFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Падащо меню
// ─────────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends BaseProps {
  defaultValue?: string;
  options: readonly SelectOption[];
  /** Първи ред „—", когато празното е допустима стойност. */
  placeholder?: string;
  /**
   * Известява формата за смяна на избора.
   *
   * Нужно е, когато ИЗБОРЪТ УПРАВЛЯВА ОСТАНАЛОТО: видът на продукта решава
   * дали изобщо да се питат тегло и наличност, а цветът на корицата се
   * вижда веднага в предварителния изглед. Стойността си остава тук —
   * формата само я наблюдава.
   */
  onValueChange?: (value: string) => void;
}

/**
 * НАТИВЕН `<select>`, а не компонентът от components/ui/select.tsx.
 *
 * Причината е същата, поради която формата за регистрация ползва нативни
 * отметки: Radix рисува `<button>` със списък и работи САМО с JavaScript.
 * Админ формата се праща със server action и без JavaScript — падне ли
 * скриптът, нативният `<select>` пак изпраща стойност, а Radix не изпраща
 * нищо и курсът се записва с празно ниво.
 */
export function SelectField({
  defaultValue,
  options,
  placeholder,
  onValueChange,
  ...base
}: SelectFieldProps) {
  const { control } = ids(base.name);

  // КОНТРОЛИРАНО, не `defaultValue` — иначе изборът изчезва при всяко
  // неуспешно изпращане. Пълното обяснение е в главата на файла.
  //
  // Началната стойност се взима веднъж и после менюто помни СВОЯ избор.
  // Точно това е желаното: върне ли сървърът грешка по друго поле,
  // избраното от човека тежи повече от онова, което сървърът е получил.
  const [value, setValue] = useState(defaultValue ?? "");

  // Само контролирането НЕ стига. `form.reset()` на React пипа DOM-а пряко,
  // а React смята, че нищо не се е променило (стойността в състоянието си е
  // същата) и не пренаписва елемента. Затова изборът се налага наново след
  // всяко рисуване — измерено, не предположено: без този ефект e2e тестът
  // намира менюто празно след неуспешно изпращане.
  const node = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (node.current && node.current.value !== value) {
      node.current.value = value;
    }
  });

  return (
    <FieldFrame {...base}>
      <select
        ref={node}
        id={control}
        name={base.name}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.name, {
          hasHint: Boolean(base.hint),
          hasError: Boolean(base.error),
        })}
        className={cn(CONTROL, "h-9 appearance-none bg-background pr-8")}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Отметка
// ─────────────────────────────────────────────────────────────────────────

interface CheckboxFieldProps extends Omit<BaseProps, "required"> {
  defaultChecked?: boolean;
}

export function CheckboxField({
  defaultChecked,
  hint,
  error,
  label,
  name,
  className,
}: CheckboxFieldProps) {
  const { control, error: errorId, hint: hintId } = ids(name);

  // Контролирана по същата причина като менюто: `form.reset()` след
  // server action връща НАЧАЛНОТО състояние на отметката, не избраното.
  // Иначе човек отмята „Показвай курса на сайта", греши цената и след
  // поправката публикува курс, който мисли за скрит.
  const [checked, setChecked] = useState(defaultChecked ?? false);

  // Същият ефект като при менюто и по същата причина — виж там.
  const node = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (node.current && node.current.checked !== checked) {
      node.current.checked = checked;
    }
  });

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-start gap-3">
        {/* Нативна отметка, не Radix — виж коментара при SelectField. */}
        <input
          ref={node}
          id={control}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, {
            hasHint: Boolean(hint),
            hasError: Boolean(error),
          })}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <label htmlFor={control} className="text-sm leading-relaxed">
          {label}
        </label>
      </div>

      {hint ? (
        <p id={hintId} className="ml-7 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="ml-7 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Група
// ─────────────────────────────────────────────────────────────────────────

/**
 * Раздел във формата.
 *
 * `<fieldset>` с `<legend>`, не `<div>` със заглавие: четецът обявява
 * принадлежността („Превод на немски, група") вместо да изсипе двайсет
 * несвързани полета в един списък.
 */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        "rounded-xl border border-border bg-card px-5 py-5",
        className,
      )}
    >
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {description ? (
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}
