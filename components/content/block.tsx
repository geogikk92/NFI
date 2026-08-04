// ТЕРИТОРИЯ НА БОБИ · задача 18 — редактируемият остров на страницата.
//
// Един ред в JSX. Всичко останало около него е закован дизайн.
//
//   <Block k="about.who" locale={locale} />
//
// ТРИТЕ СЪСТОЯНИЯ и защо са точно тези:
//
//   • има текст за ТОЗИ език → показва се;
//   • няма, но блокът има стойност в кода → показва се тя (датата на
//     старта работи от първия ден, без нито един ред в базата);
//   • няма нито едното → AwaitingLegalText, тоест видима жълта бележка,
//     която СПИРА деплоя през scripts/check-legal-placeholders.mjs.
//
// Третото е сърцето на подхода. Липсващият немски превод е точно толкова
// счупена страница, колкото и твърде дългият текст — само че по-тих.
// Затова празният блок не е „нищо", а видим дълг.

import { Fragment } from "react";
import { AwaitingLegalText } from "@/components/content/legal-page";
import { loadBlocks, resolveBlock } from "@/lib/content/blocks-db";
import { blockSpec, toParagraphs } from "@/lib/content/registry";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  /** Ключ от lib/content/registry.ts. */
  k: string;
  locale: Locale;
  /** Черновата вместо публикуваното — само в preview режим. */
  draft?: boolean;
  /**
   * Какво да пише в жълтата бележка, когато текстът липсва. Немски е
   * НАРОЧНО: бележката е за екипа и за клиентката, не за посетителя, и
   * така върви с останалите указания в проекта.
   */
  awaiting: string;
  className?: string;
}

/**
 * Дълъг текст: абзаците са празен ред.
 *
 * Никакъв HTML от базата не стига до React — единственият
 * `dangerouslySetInnerHTML` в проекта остава този за JSON-LD.
 */
export async function Block({ k, locale, draft, awaiting, className }: Props) {
  const spec = blockSpec(k);
  if (!spec) {
    throw new Error(`Непознат блок „${k}" в JSX.`);
  }

  const blocks = await loadBlocks();
  const resolved = resolveBlock(blocks, k, locale, { draft });

  if (!resolved.value) {
    return <AwaitingLegalText what={awaiting} who="der Kundin" />;
  }

  const paragraphs = toParagraphs(resolved.value);

  const body = paragraphs.map((paragraph, index) => (
    <p key={index}>{paragraph}</p>
  ));

  // БЕЗ обвивка по подразбиране. Типографският слой се управлява от
  // `.prose > * + *` — правило за ПРЯК наследник. Обвиващ <div> прави
  // абзаците внуци и разстоянието между тях изчезва мълчаливо: текстът
  // изглежда като един слепен блок. (Хванато при проверка на живо.)
  if (!className) return <>{body}</>;

  return <div className={className}>{body}</div>;
}

/**
 * Кратък текст в готов ред — без обвивка и без абзаци.
 *
 * За местата, където блокът е ЧАСТ от изречение или от заглавие
 * („22 000+ българи учат немски заедно"). Липсващата стойност тук връща
 * `null`, а не жълта бележка: тези блокове ВИНАГИ имат стойност в кода,
 * тоест празно означава програмна грешка в регистъра, а не липсващ текст.
 */
export async function BlockText({
  k,
  locale,
  draft,
}: {
  k: string;
  locale: Locale;
  draft?: boolean;
}) {
  const blocks = await loadBlocks();
  const resolved = resolveBlock(blocks, k, locale, { draft });

  return <Fragment>{resolved.value ?? ""}</Fragment>;
}

/**
 * Стойността като низ — за места, където трябва да влезе в атрибут или в
 * метаданни, а не в JSX (title, aria-label, generateMetadata).
 */
export async function blockValue(
  k: string,
  locale: Locale,
  options: { draft?: boolean } = {},
): Promise<string | null> {
  const blocks = await loadBlocks();
  return resolveBlock(blocks, k, locale, options).value;
}
