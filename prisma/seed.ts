// Сийд за разработка. ИДЕМПОТЕНТЕН — пуска се колкото пъти искаш.
//
//   npm run db:seed
//
// Данните са минимални нарочно: колкото да има какво да се рисува и да
// се тества, без да се преструват на истинско съдържание. Истинското
// идва от Василена (задача 18a) и не се измисля тук.
//
// ⚠️ Не се пуска срещу продукционна база — създава админ с известна парола.

import { db } from "../lib/db";
import { LEGAL_TEXT_VERSIONS } from "../lib/legal";
import { hashPassword } from "../lib/auth/password";

/**
 * Паролата за РАЗРАБОТКА на сийднатите профили.
 *
 * Стои открито в кода нарочно и това е безопасно точно защото сийдът
 * отказва да тръгне при NODE_ENV=production. В живата база паролата се
 * задава с отделна команда, която не пази нищо:
 *
 *     DATABASE_URL="…" npm run admin:password -- admin@nfi.local
 *
 * Преди 30.07.2026 тези профили бяха БЕЗ парола изобщо — понеже /admin
 * тогава не проверяваше кой влиза, никой не забеляза.
 */
const DEV_PASSWORD = "nfi-lokalna-parola";

async function seedUsers() {
  // Хешира се веднъж за двата профила: scrypt при N=16384 иска ~80 ms и
  // два пъти по 80 ms в сийда се усещат.
  const passwordHash = await hashPassword(DEV_PASSWORD);

  const admin = await db.user.upsert({
    where: { email: "admin@nfi.local" },
    // `update` НЕ е празен: при повторен сийд върху съществуваща база
    // празният update оставя стария (или липсващия) хеш и профилът пак не
    // влиза никъде. Същият капан вече изяде английските преводи веднъж.
    update: { passwordHash },
    create: {
      email: "admin@nfi.local",
      name: "Василена",
      role: "ADMIN",
      locale: "bg",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  const student = await db.user.upsert({
    where: { email: "student@nfi.local" },
    update: { passwordHash },
    create: {
      email: "student@nfi.local",
      name: "Max Mustermann",
      role: "STUDENT",
      locale: "de",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  console.log(
    `  Профили: admin@nfi.local и student@nfi.local, парола „${DEV_PASSWORD}" (само за разработка).`,
  );

  return { admin, student };
}

async function seedCourses() {
  const courses = [
    {
      slug: "deutsch-a1-abendkurs",
      title: "Немски A1 · вечерен курс",
      titleDe: "Deutsch A1 · Abendkurs",
      titleEn: "German A1 · evening course",
      level: "A1" as const,
      format: "PRESENCE" as const,
      summary: "За начинаещи без предварителни знания.",
      summaryDe: "Für Anfänger ohne Vorkenntnisse.",
      summaryEn: "For complete beginners, no prior knowledge needed.",
      priceCents: 39000,
      durationWeeks: 12,
      hoursPerWeek: 4,
      maxParticipants: 12,
      sortOrder: 1,
    },
    {
      slug: "deutsch-b1-online",
      title: "Немски B1 · онлайн",
      titleDe: "Deutsch B1 · online",
      titleEn: "German B1 · online",
      level: "B1" as const,
      format: "ONLINE" as const,
      summary: "Онлайн курс с преподавател на живо.",
      summaryDe: "Online-Kurs mit Lehrkraft in Echtzeit.",
      summaryEn: "Online course with a live teacher.",
      priceCents: 45000,
      durationWeeks: 10,
      hoursPerWeek: 4,
      sortOrder: 2,
    },
    {
      slug: "pruefungsvorbereitung-b2",
      title: "Подготовка за изпит B2",
      titleDe: "Prüfungsvorbereitung B2",
      titleEn: "B2 exam preparation",
      level: "B2" as const,
      format: "HYBRID" as const,
      summary: "Целенасочена подготовка за сертификатния изпит.",
      summaryDe: "Gezielte Vorbereitung auf die Zertifikatsprüfung.",
      summaryEn: "Focused preparation for the certificate exam.",
      priceCents: 52000,
      durationWeeks: 8,
      hoursPerWeek: 6,
      sortOrder: 3,
    },
  ];

  for (const course of courses) {
    // `update` НЕ е празен нарочно: сийдът трябва да донася нови полета
    // (напр. английските преводи) и в база, която вече е сийдната. С
    // `update: {}` съществуващият ред остава без превод и /en показва
    // немско съдържание.
    await db.course.upsert({
      where: { slug: course.slug },
      update: course,
      create: { ...course, published: true, publishedAt: new Date() },
    });
  }
}

async function seedProducts() {
  // Дигитален: подлежи на Widerruf съгласие преди сваляне (§356 Abs. 5).
  const workbook = await db.product.upsert({
    where: { slug: "arbeitsheft-a1-pdf" },
    update: {
      titleEn: "Workbook A1 (PDF)",
      coverColor: "INK",
      coverBrand: "NFI · Arbeitsheft",
      coverEyebrow: "Grundstufe",
      coverTitle: "Arbeitsheft A1",
      coverMeta: "120 Seiten · A1",
    },
    create: {
      slug: "arbeitsheft-a1-pdf",
      title: "Работна тетрадка A1 (PDF)",
      titleDe: "Arbeitsheft A1 (PDF)",
      titleEn: "Workbook A1 (PDF)",
      type: "DIGITAL",
      priceCents: 1200,
      vatCategory: "ELECTRONIC",
      // Типографска корица — в мокъпа материалите нямат снимки.
      coverColor: "INK",
      coverBrand: "NFI · Arbeitsheft",
      coverEyebrow: "Grundstufe",
      coverTitle: "Arbeitsheft A1",
      coverMeta: "120 Seiten · A1",
      published: true,
      publishedAt: new Date(),
      sortOrder: 1,
    },
  });

  const existingFile = await db.productFile.findFirst({
    where: { productId: workbook.id },
  });
  if (!existingFile) {
    await db.productFile.create({
      data: {
        productId: workbook.id,
        label: "Arbeitsheft A1",
        storageKey: "seed/arbeitsheft-a1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1_048_576,
        watermark: true,
      },
    });
  }

  // Физически: има тегло, значи и доставка по зони.
  await db.product.upsert({
    where: { slug: "lehrbuch-a1" },
    update: {
      titleEn: "Coursebook A1 (print)",
      coverColor: "GREEN",
      coverBrand: "NFI · Lehrbuch",
      coverEyebrow: "Kursbuch",
      coverTitle: "Deutsch A1",
      coverMeta: "gedruckt · A1",
    },
    create: {
      slug: "lehrbuch-a1",
      title: "Учебник A1 (печатно издание)",
      titleDe: "Lehrbuch A1 (gedruckt)",
      titleEn: "Coursebook A1 (print)",
      type: "PHYSICAL",
      priceCents: 2800,
      vatCategory: "GOODS",
      coverColor: "GREEN",
      coverBrand: "NFI · Lehrbuch",
      coverEyebrow: "Kursbuch",
      coverTitle: "Deutsch A1",
      coverMeta: "gedruckt · A1",
      weightGrams: 450,
      stock: 25,
      published: true,
      publishedAt: new Date(),
      sortOrder: 2,
    },
  });
}

async function seedMoreProducts() {
  // Двата материала от мокъпа (magazin.html) — с червена и златна корица,
  // за да е видим целият рафт. Цените са от мокъпа.
  const extra = [
    {
      slug: "verben-mit-praeposition",
      title: "500-те глагола с предлози",
      titleDe: "Verben mit Präposition",
      titleEn: "500 verbs with prepositions",
      description:
        "Глаголите, при които все се колебаеш кой предлог и кой падеж идват след тях. Всеки с по едно примерно изречение.",
      descriptionDe:
        "Die Verben, bei denen man immer zögert, welche Präposition und welcher Fall folgen. Jedes mit einem Beispielsatz.",
      descriptionEn:
        "The verbs where you always hesitate which preposition and case follow. Each with one example sentence.",
      type: "DIGITAL" as const,
      priceCents: 2400,
      vatCategory: "ELECTRONIC" as const,
      coverColor: "RED" as const,
      coverBrand: "NFI · Wortschatz",
      coverEyebrow: "Verben",
      coverTitle: "Verben mit Präposition",
      coverMeta: "500 Verben · A2–B2",
      sortOrder: 3,
    },
    {
      slug: "uebungen-praepositionen",
      title: "Упражнения: предлози и падежи",
      titleDe: "Übungen: Präpositionen und Fälle",
      titleEn: "Exercises: prepositions and cases",
      description:
        "Сто упражнения с отговори, подредени по трудност. За хора, които разбират правилото, но се спъват в говора.",
      descriptionDe:
        "Hundert Übungen mit Lösungen, nach Schwierigkeit geordnet. Für Menschen, die die Regel verstehen, aber im Sprechen stocken.",
      descriptionEn:
        "A hundred exercises with answers, ordered by difficulty. For people who know the rule but stumble when speaking.",
      type: "DIGITAL" as const,
      priceCents: 1800,
      vatCategory: "ELECTRONIC" as const,
      coverColor: "GOLD" as const,
      coverBrand: "NFI · Übungen",
      coverEyebrow: "Übungsheft",
      coverTitle: "Präpositionen",
      coverMeta: "100 Übungen · A2–B1",
      sortOrder: 4,
    },
  ];

  for (const product of extra) {
    await db.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: { ...product, published: true, publishedAt: new Date() },
    });
  }
}

async function seedLevelTest() {
  // Примерни въпроси, за да работи потокът. НЕ са методически изчистени —
  // истинските минават през Василена като преподавател (виж риска
  // „съдържанието идва отвън" в ПЛАН.md).
  const questions = [
    {
      position: 1,
      level: "A1" as const,
      prompt: "Wie ___ Sie?",
      options: [
        { id: "a", text: "heißen", correct: true },
        { id: "b", text: "heißt", correct: false },
        { id: "c", text: "heiße", correct: false },
      ],
    },
    {
      position: 2,
      level: "A1" as const,
      prompt: "Ich komme ___ Bulgarien.",
      options: [
        { id: "a", text: "von", correct: false },
        { id: "b", text: "aus", correct: true },
        { id: "c", text: "nach", correct: false },
      ],
    },
    {
      position: 3,
      level: "A2" as const,
      prompt: "Gestern ___ ich im Kino.",
      options: [
        { id: "a", text: "bin", correct: false },
        { id: "b", text: "war", correct: true },
        { id: "c", text: "habe", correct: false },
      ],
    },
    {
      position: 4,
      level: "A2" as const,
      prompt: "Der Film, ___ wir gesehen haben, war gut.",
      options: [
        { id: "a", text: "den", correct: true },
        { id: "b", text: "dem", correct: false },
        { id: "c", text: "der", correct: false },
      ],
    },
    {
      position: 5,
      level: "B1" as const,
      prompt: "Wenn ich Zeit ___, würde ich mehr lesen.",
      options: [
        { id: "a", text: "habe", correct: false },
        { id: "b", text: "hätte", correct: true },
        { id: "c", text: "hatte", correct: false },
      ],
    },
    {
      position: 6,
      level: "B1" as const,
      prompt: "Das Projekt muss bis Freitag ___ werden.",
      options: [
        { id: "a", text: "abgeschlossen", correct: true },
        { id: "b", text: "abschließen", correct: false },
        { id: "c", text: "abschließend", correct: false },
      ],
    },
    {
      position: 7,
      level: "B2" as const,
      prompt: "___ der schwierigen Lage blieb er ruhig.",
      options: [
        { id: "a", text: "Wegen", correct: false },
        { id: "b", text: "Trotz", correct: true },
        { id: "c", text: "Während", correct: false },
      ],
    },
    {
      position: 8,
      level: "C1" as const,
      prompt: "Seine Argumentation ist zwar schlüssig, ___ nicht überzeugend.",
      options: [
        { id: "a", text: "aber", correct: false },
        { id: "b", text: "jedoch", correct: true },
        { id: "c", text: "denn", correct: false },
      ],
    },
  ];

  for (const question of questions) {
    const existing = await db.levelTestQuestion.findFirst({
      where: { position: question.position },
    });
    if (!existing) {
      await db.levelTestQuestion.create({ data: question });
    }
  }
}

async function seedShipping() {
  const zones = [
    {
      name: "Германия",
      countries: ["DE"],
      priceCents: 490,
      freeAboveCents: 5000,
      maxWeightGrams: 5000,
    },
    {
      name: "Австрия",
      countries: ["AT"],
      priceCents: 890,
      freeAboveCents: 8000,
      maxWeightGrams: 5000,
    },
    {
      name: "България",
      countries: ["BG"],
      priceCents: 590,
      freeAboveCents: 6000,
      maxWeightGrams: 5000,
    },
  ];

  for (const zone of zones) {
    const existing = await db.shippingZone.findFirst({
      where: { name: zone.name },
    });
    if (!existing) {
      await db.shippingZone.create({ data: zone });
    }
  }
}

async function seedDiscounts() {
  await db.discount.upsert({
    where: { code: "WILLKOMMEN10" },
    update: {},
    create: {
      code: "WILLKOMMEN10",
      kind: "PERCENT",
      value: 10,
      minOrderCents: 2000,
      maxRedemptions: 100,
      active: true,
    },
  });
}

async function seedPages() {
  const pages = [
    { slug: "home", title: "Начало" },
    { slug: "about", title: "За нас" },
    { slug: "contact", title: "Контакт" },
    { slug: "community", title: "Общност" },
    { slug: "impressum", title: "Impressum" },
    { slug: "datenschutz", title: "Datenschutzerklärung" },
    { slug: "agb", title: "AGB" },
    { slug: "widerruf", title: "Widerrufsbelehrung" },
  ];

  for (const page of pages) {
    await db.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, draft: { sections: [] } },
    });
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Сийдът не се пуска срещу продукция.");
  }

  const { admin } = await seedUsers();
  await seedCourses();
  await seedProducts();
  await seedMoreProducts();
  await seedLevelTest();
  await seedShipping();
  await seedDiscounts();
  await seedPages();

  const counts = {
    потребители: await db.user.count(),
    курсове: await db.course.count(),
    продукти: await db.product.count(),
    "зони за доставка": await db.shippingZone.count(),
    отстъпки: await db.discount.count(),
    "въпроси в теста": await db.levelTestQuestion.count(),
    страници: await db.page.count(),
  };

  console.log("Сийдът мина. В базата има:");
  for (const [label, count] of Object.entries(counts)) {
    console.log(`  ${label}: ${count}`);
  }
  console.log(`\nАдмин: ${admin.email}`);
  console.log(
    `Версии на правните текстове: ${Object.values(LEGAL_TEXT_VERSIONS)[0]}`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
