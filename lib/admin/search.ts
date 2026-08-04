import "server-only";

// АДМИН · задача 17f1 — глобалното търсене.
//
// Един вход, седем таблици. Причината е поведението на човек: Василена
// помни „Мария", но не помни дали Мария е абонат, курсист със сертификат
// или е оставила заявка за обаждане. Да я караме да отгатне правилния
// екран, преди да потърси, е точно обратното на полезно.
//
// ─────────────────────────────────────────────────────────────────────────
//  ГРАНИЦИ, ВЗЕТИ НАРОЧНО
// ─────────────────────────────────────────────────────────────────────────
// • Търси се по ПОДНИЗ, нечувствително към регистър. Пълнотекстово
//   търсене с рангове би било по-умно, но иска индекси и настройка за
//   български, а тук данните са хиляди редове, не милиони.
// • По пет резултата на вид. Търсенето е за „заведи ме там", не за
//   справка — за справка има отделните екрани с филтри.
// • Заявка на вид, паралелно. Седем леки заявки едновременно са по-бързи
//   от една сложна с UNION, а и всяка може да се чете отделно.

import { db } from "@/lib/db";

export const MIN_QUERY_LENGTH = 2;
const PER_GROUP = 5;

export interface SearchHit {
  /** Уникален за реда — два еднакви href-а иначе дават еднакъв React ключ. */
  id: string;
  /** Какво пише на реда. */
  title: string;
  /** Втори ред: имейл, ниво, цена — каквото различава. */
  detail?: string;
  href: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  hits: SearchHit[];
}

/**
 * Търси навсякъде. Никога не хвърля: падне ли една заявка, останалите
 * групи пак се показват — половин резултат е по-добре от празен екран.
 */
export async function searchEverywhere(raw: string): Promise<SearchGroup[]> {
  const query = raw.trim();
  if (query.length < MIN_QUERY_LENGTH) return [];

  const contains = { contains: query, mode: "insensitive" as const };

  // allSettled, НЕ all: падне ли една заявка (липсваща таблица след
  // миграция, времеви лимит), останалите групи пак се показват. Половин
  // резултат е по-полезен от празен екран с грешка.
  const settled = await Promise.allSettled([
    db.course.findMany({
      where: { OR: [{ title: contains }, { slug: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, level: true },
    }),
    db.product.findMany({
      where: { OR: [{ title: contains }, { slug: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: { title: "asc" },
      select: { id: true, title: true, published: true },
    }),
    db.freeMaterial.findMany({
      where: { OR: [{ title: contains }, { slug: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: { title: "asc" },
      select: { id: true, title: true, published: true },
    }),
    db.review.findMany({
      where: { OR: [{ authorName: contains }, { body: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: { createdAt: "desc" },
      select: { id: true, authorName: true, rating: true },
    }),
    db.certificate.findMany({
      where: { OR: [{ holderName: contains }, { number: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: { issuedAt: "desc" },
      select: { id: true, holderName: true, number: true },
    }),
    db.newsletterSubscriber.findMany({
      where: { OR: [{ email: contains }, { name: contains }] },
      take: PER_GROUP,
      // Без ред базата решава КОИ пет се показват и отговорът се мени
      // между две еднакви търсения.
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, status: true },
    }),
    db.callRequest.findMany({
      where: {
        OR: [{ name: contains }, { email: contains }, { phone: contains }],
      },
      take: PER_GROUP,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, status: true },
    }),
  ]);

  /** Резултатът на i-тата заявка, или празен списък при провал. */
  function rows<T>(index: number): T[] {
    const result = settled[index];
    if (result.status === "fulfilled") return result.value as T[];
    console.error("[admin] Част от търсенето се провали:", result.reason);
    return [];
  }

  const courses = rows<{ id: string; title: string; level: string }>(0);
  const products = rows<{ id: string; title: string; published: boolean }>(1);
  const materials = rows<{ id: string; title: string; published: boolean }>(2);
  const reviews = rows<{ id: string; authorName: string; rating: number }>(3);
  const certificates = rows<{
    id: string;
    holderName: string;
    number: string;
  }>(4);
  const subscribers = rows<{ id: string; email: string; status: string }>(5);
  const callRequests = rows<{ id: string; name: string; phone: string | null }>(
    6,
  );

  const groups: SearchGroup[] = [
    {
      key: "courses",
      label: "Курсове",
      hits: courses.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.level,
        href: `/admin/kursove/${row.id}`,
      })),
    },
    {
      key: "products",
      label: "Продукти",
      hits: products.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.published ? "в магазина" : "скрит",
        href: `/admin/produkti/${row.id}`,
      })),
    },
    {
      key: "materials",
      label: "Безплатни материали",
      hits: materials.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.published ? "на сайта" : "скрит",
        href: `/admin/materiali/${row.id}`,
      })),
    },
    {
      key: "reviews",
      label: "Отзиви",
      hits: reviews.map((row) => ({
        id: row.id,
        title: row.authorName,
        detail: `${row.rating} от 5`,
        href: `/admin/recenzii/${row.id}`,
      })),
    },
    {
      key: "certificates",
      label: "Сертификати",
      hits: certificates.map((row) => ({
        id: row.id,
        title: row.holderName,
        detail: row.number,
        href: `/admin/sertifikati/${row.id}`,
      })),
    },
    {
      key: "subscribers",
      label: "Абонати",
      hits: subscribers.map((row) => ({
        id: row.id,
        title: row.email,
        href: `/admin/abonati/${row.id}`,
      })),
    },
    {
      key: "callRequests",
      label: "Заявки за обаждане",
      hits: callRequests.map((row) => ({
        id: row.id,
        title: row.name,
        detail: row.phone ?? undefined,
        // Заявките нямат детайлна страница — водим до списъка им.
        href: "/admin/anketi",
      })),
    },
  ];

  return groups.filter((group) => group.hits.length > 0);
}
