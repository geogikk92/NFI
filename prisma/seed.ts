// Сийд за разработка. ИДЕМПОТЕНТЕН — пуска се колкото пъти искаш.
//
//   npm run db:seed
//
// Данните са минимални нарочно: колкото да има какво да се рисува и да
// се тества, без да се преструват на истинско съдържание. Истинското
// идва от Василена (задача 18a) и не се измисля тук.
//
// ⚠️ Отказва да пише в НЕлокална база: създава примерно съдържание и
// профили с публикувана в хранилището парола.

import { db } from "../lib/db";
import { LEGAL_TEXT_VERSIONS } from "../lib/legal";
import { hashPassword } from "../lib/auth/password";
import { assertLocalDatabase } from "../lib/db-target";

/**
 * Паролата за РАЗРАБОТКА на сийднатите профили.
 *
 * Стои открито в кода нарочно. Това е безопасно, защото сийдът отказва да
 * пише в НЕлокална база (виж assertNotProduction по-долу) и защото НЕ пипа
 * вече съществуваща парола. В живата база паролата се задава с отделна
 * команда, която не пази нищо:
 *
 *     DATABASE_URL="…" npm run admin:password -- admin@nfi.local
 *
 * Преди 30.07.2026 тези профили бяха БЕЗ парола изобщо — понеже /admin
 * тогава не проверяваше кой влиза, никой не забеляза.
 */
const DEV_PASSWORD = "1";

async function seedUsers() {
  // Хешира се веднъж за двата профила: scrypt при N=16384 иска ~80 ms и
  // два пъти по 80 ms в сийда се усещат.
  const passwordHash = await hashPassword(DEV_PASSWORD);

  // `update` е ПРАЗЕН по отношение на паролата — и това е поправка на
  // дефект, живял един час на 30.07.2026.
  //
  // Първо сложих `update: { passwordHash }` по аналогия с курсовете, където
  // празният update изяде английските преводи. Но при парола аналогията е
  // точно обратна: повторен сийд върху база, в която Василена вече си е
  // задала истинска парола, би я върнал на стойността от този файл — а тя
  // е ПУБЛИКУВАНА В ХРАНИЛИЩЕТО. Деплой документът пък казва сийдът да се
  // пуска локално срещу продукционния низ.
  //
  // Затова паролата се дава само при СЪЗДАВАНЕ, а по-долу — и на профил,
  // който още няма никаква.
  const admin = await db.user.upsert({
    where: { email: "admin@nfi.local" },
    update: {},
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
    update: {},
    create: {
      email: "student@nfi.local",
      name: "Max Mustermann",
      role: "STUDENT",
      locale: "de",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  // Профил БЕЗ никаква парола получава тази за разработка. Такива са
  // редовете, създадени от по-стар сийд, преди входът да съществува —
  // без това те не влизат никъде и изглеждат като счупен вход.
  const withoutPassword = [admin, student].filter((u) => !u.passwordHash);
  if (withoutPassword.length > 0) {
    await db.user.updateMany({
      where: { id: { in: withoutPassword.map((u) => u.id) } },
      data: { passwordHash },
    });
    console.log(
      `  Дадена парола за разработка на ${withoutPassword.length} профил(а) без такава.`,
    );
  }

  console.log(
    `  Профили: admin@nfi.local и student@nfi.local. Парола за разработка: „${DEV_PASSWORD}"`,
  );
  console.log(
    "  СЪЩЕСТВУВАЩА парола НЕ се пипа — за смяна: npm run admin:password",
  );

  return { admin, student };
}

async function seedCourses() {
  const courses = [
    {
      slug: "deutsch-a1-abendkurs",
      title: "Немски A1 · онлайн",
      titleDe: "Deutsch A1 · online",
      titleEn: "German A1 · online",
      level: "A1" as const,
      // Всички курсове са ONLINE през Zoom (потвърдено 15.08.2026).
      // Присъствен и хибриден формат схемата ги поддържа, но институтът
      // не ги предлага — примерните данни не бива да твърдят обратното.
      format: "ONLINE" as const,
      summary: "За начинаещи без предварителни знания.",
      summaryDe: "Für Anfänger ohne Vorkenntnisse.",
      summaryEn: "For complete beginners, no prior knowledge needed.",
      priceCents: 39000,
      durationWeeks: 12,
      hoursPerWeek: 4,
      // ИЗРИЧНО null (15.08.2026): реален таван на групата няма, а
      // „най-много 12 участници" беше обещание, което не се спазва.
      // Празното поле НЕ стига — `update: course` по-долу пипа само
      // подадените колони, тоест изпуснато поле оставя старата стойност
      // в база, която вече е сийдната. Публичната страница просто не
      // показва реда „Група", когато е null.
      maxParticipants: null,
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
      format: "ONLINE" as const,
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

/**
 * Примерни заявки за обаждане.
 *
 * Съществуват по същата причина като примерните преводи: екранът трябва да
 * може да се види, без да се чака истински посетител да остави телефон.
 * Изтрий ги, щом тръгнат истинските заявки.
 *
 * Данните са ЯВНО измислени — имена от учебник, домейн „example.com".
 *
 * Четирите покриват СЪСТОЯНИЯТА, които админът среща, а не четири
 * еднакви реда:
 *
 *   1. „Нова" от страница на курс, със съобщение и предпочитан час — всекидневният
 *      случай и единственият, на който излиза бързото „Потърсен";
 *   2. „Нова" от теста за ниво, БЕЗ телефон — детайлът има отделен изглед за
 *      заявка само с имейл и той иначе не се вижда никога;
 *   3. „Потърсен" с човешка бележка и handledAt — как изглежда обработена заявка;
 *   4. „Спам" с АВТОМАТИЧНА бележка, каквато слага honeypot защитата.
 *
 * Четвъртата е нарочна по същия начин, по който третият превод е с
 * просрочен срок: тя е единственият начин да се види предупреждението във
 * формата, че бележката е сложена от автоматичната проверка, а не от човек.
 * Иначе този клон на екрана чака да мине бот.
 */
async function seedCallRequests() {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Курсът се търси по slug, а не се закача по ред: сийдът на курсовете
  // може да се пусне отделно и подредбата да е друга.
  const course = await db.course.findUnique({
    where: { slug: "deutsch-b1-online" },
    select: { id: true },
  });

  const requests = [
    {
      name: "Мария Иванова",
      email: "maria.obazhdane@example.com",
      phone: "+49 151 0000011",
      message:
        "Здравейте, интересувам се от B1 онлайн.\nРаботя до 17 ч., затова питам дали има вечерна група.",
      preferredTime: "след 18:00",
      source: "COURSE_PAGE" as const,
      status: "NEW" as const,
      courseId: course?.id ?? null,
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      name: "Petar Georgiev",
      email: "petar.obazhdane@example.com",
      phone: null,
      message: null,
      preferredTime: null,
      source: "LEVEL_TEST" as const,
      status: "NEW" as const,
      courseId: null,
      createdAt: new Date(now - 1 * day),
    },
    {
      name: "Anna Schmidt",
      email: "anna.obazhdane@example.com",
      phone: "+49 151 0000013",
      message: "Питам за подготовката за изпит B2 през септември.",
      preferredTime: "сутрин",
      source: "CONTACT_PAGE" as const,
      status: "CONTACTED" as const,
      courseId: null,
      handledAt: new Date(now - 2 * day),
      handledNote:
        "Звъннах на 2 октомври, не вдига. Пратих имейл с датите на групите.",
      createdAt: new Date(now - 4 * day),
    },
    {
      name: "aaa bbb",
      email: "spam.obazhdane@example.com",
      phone: "+00 000 000",
      message: "http://example.com/oferta http://example.com/oferta",
      preferredTime: null,
      source: "CONTACT_PAGE" as const,
      status: "SPAM" as const,
      courseId: null,
      // Точно това пише honeypot защитата в lib/cms/call-requests-db.ts.
      // Началото („Автоматично маркирана:") е ключът, по който формата
      // разпознава, че бележката НЕ е човешка — виж isAutomaticNote.
      handledNote: "Автоматично маркирана: honeypot",
      createdAt: new Date(now - 6 * day),
    },
  ];

  for (const request of requests) {
    // Заявката няма уникална колона — истинските нямат номер и не бива да
    // имат. Затова идемпотентността е по имейла на примера: той е
    // измислен и не може да дойде от истински посетител.
    const existing = await db.callRequest.findFirst({
      where: { email: request.email },
      select: { id: true },
    });

    if (existing) continue;

    await db.callRequest.create({ data: request });
  }
}

/**
 * Примерни заявки за превод.
 *
 * Съществуват, защото публичната форма за подаване още я няма (тя чака
 * хранилището — виж lib/storage/index.ts), а екранът в админа трябва да
 * може да се види и тества. Изтрий ги, щом тръгнат истинските заявки.
 *
 * Данните са ЯВНО измислени: имена от учебник, домейн „example.com".
 * Заявка за превод носи дипломи и актове за раждане — примерът не бива да
 * прилича на истински човек, дори по случайност.
 *
 * Номерата НЕ минават през Counter: броячът е за фактури и сертификати,
 * където дупка в поредицата е счетоводен проблем. Тук стойността е само
 * за показване, а фиксираните номера правят сийда идемпотентен.
 */
async function seedTranslations() {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const requests = [
    {
      number: "NFI-P-2026-000001",
      accessToken: "seed-token-primerna-zayavka-001",
      name: "Мария Иванова",
      email: "maria.example@example.com",
      phone: "+49 151 0000001",
      sourceLang: "bg",
      targetLang: "de",
      certified: true,
      status: "SUBMITTED" as const,
      notes: null,
      createdAt: new Date(now - 2 * day),
      // Три месеца след подаването — примерен срок, докато не се уточни
      // истинският в docs/ПРАВНИ-ИЗИСКВАНИЯ.md.
      purgeAfter: new Date(now + 88 * day),
      documents: [
        { filename: "diploma-bakalavar.pdf", mimeType: "application/pdf", sizeBytes: 842_000, pages: 2, isSource: true },
        { filename: "prilozhenie-otsenki.pdf", mimeType: "application/pdf", sizeBytes: 1_240_000, pages: 4, isSource: true },
      ],
    },
    {
      number: "NFI-P-2026-000002",
      accessToken: "seed-token-primerna-zayavka-002",
      name: "Петър Georgiev",
      email: "petar.example@example.com",
      phone: null,
      sourceLang: "bg",
      targetLang: "de",
      certified: true,
      status: "QUOTED" as const,
      quotedCents: 8_500,
      quotedVatRate: "20.00",
      quotedAt: new Date(now - 5 * day),
      quoteExpiresAt: new Date(now + 9 * day),
      notes: "Клиентът пита дали може да получи и хартиено копие по пощата.",
      createdAt: new Date(now - 9 * day),
      purgeAfter: new Date(now + 81 * day),
      documents: [
        { filename: "akt-za-razhdane.pdf", mimeType: "application/pdf", sizeBytes: 410_000, pages: 1, isSource: true },
      ],
    },
    {
      number: "NFI-P-2026-000003",
      accessToken: "seed-token-primerna-zayavka-003",
      name: "Anna Schmidt",
      email: "anna.example@example.com",
      phone: "+49 151 0000003",
      sourceLang: "de",
      targetLang: "bg",
      certified: false,
      status: "DELIVERED" as const,
      quotedCents: 12_000,
      quotedVatRate: "20.00",
      quotedAt: new Date(now - 40 * day),
      quoteExpiresAt: new Date(now - 26 * day),
      deliveredAt: new Date(now - 20 * day),
      notes: null,
      createdAt: new Date(now - 45 * day),
      // Просрочен НАРОЧНО: така екранът показва и предупреждението за
      // изтекъл срок, без да се чака истинска заявка да го докара.
      purgeAfter: new Date(now - 3 * day),
      documents: [
        { filename: "arbeitszeugnis.pdf", mimeType: "application/pdf", sizeBytes: 302_000, pages: 1, isSource: true },
        { filename: "arbeitszeugnis-prevod.pdf", mimeType: "application/pdf", sizeBytes: 318_000, pages: 1, isSource: false },
      ],
    },
  ];

  for (const { documents, ...request } of requests) {
    const existing = await db.translationRequest.findUnique({
      where: { number: request.number },
      select: { id: true },
    });

    if (existing) continue;

    await db.translationRequest.create({
      data: {
        ...request,
        documents: {
          create: documents.map((doc, index) => ({
            isSource: doc.isSource,
            filename: doc.filename,
            // Ключът сочи в хранилище, което още го няма. Записва се, за да
            // има какво да намери реализацията, щом дойде.
            storageKey: `translation/${request.number}/${index}-${doc.filename}`,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            pages: doc.pages,
          })),
        },
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  СЪДЪРЖАНИЕТО НЕ СЕ СИЙДВА. Нарочно.
// ─────────────────────────────────────────────────────────────────────────
//
// Тук стоеше seedPages(), който създаваше 8 празни реда в мъртвия модел
// Page — при това с грешен инвентар: четири от тях бяха правни страници,
// които НЕ бива да са редактируеми от клиентката.
//
// Новият модел (ContentBlock) тръгва ПРАЗЕН и това е основната печалба:
//
//   • празна база = днешният одобрен сайт, дума по дума;
//   • блоковете със стойност в кода (датата на старта) я показват, докато
//     Василена наистина не ги презапише — значи промяна в кода остава
//     жива, вместо да бъде мълчаливо засенчена от сийднат ред;
//   • седемте блока, които тя дължи, остават честно празни и продължават
//     да спират деплоя, докато не бъдат написани.
//
// Сийд, който копира днешните текстове в базата, би направил стойностите
// в кода мъртви: разработчик ги сменя, нищо не се случва, никой не
// разбира защо.

/**
 * Предпазителят срещу продукция.
 *
 * ПРЕДИШНАТА версия проверяваше NODE_ENV === "production" и НЕ вършеше
 * работа: деплой документът казва „пусни го ЛОКАЛНО срещу продукционния
 * низ", а локално NODE_ENV не е production. Тоест предпазителят се
 * задействаше точно в случая, който няма как да се случи, и мълчеше в
 * този, който документираме.
 *
 * Логиката живее в lib/db-target.ts, защото същата грешка беше и в
 * тестовете — те трият ключа „taxdoc", тоест поредицата на фактурите.
 */
function assertNotProduction(): void {
  assertLocalDatabase({
    what: "Сийдът",
    why:
      "Създава примерни курсове и продукти и профили с ПУБЛИКУВАНА В\n" +
      "  ХРАНИЛИЩЕТО парола. В жива база това е инцидент.\n" +
      "  За парола на админа: npm run admin:password -- <имейл>",
    escapeHatch: {
      name: "ALLOW_REMOTE_SEED",
      value: "da-znam-kakvo-pravja",
    },
  });
}


// ─────────────────────────────────────────────────────────────────────────
//  Безплатни материали · задача 8
// ─────────────────────────────────────────────────────────────────────────

async function seedFreeMaterials() {
  // Малък, но ИСТИНСКИ PDF в хранилището — така целият поток
  // форма → токен → сваляне се минава на чиста машина, без S3.
  //
  // Scope-ът е "product", НЕ "media" (от 17m-b): безплатните материали
  // са зад форма и се свалят с DownloadGrant токен, а всичко под
  // media/ се сервира ПУБЛИЧНО от /media/[...key] — сложи ли се PDF-ът
  // там, лийд фунията пада. И минава през putObject, не през localPut:
  // директният локален запис при конфигуриран S3 оставя ключ, който в
  // bucket-а го няма → вечно изхабени токени.
  const { putObject } = await import("../lib/storage");
  const pdfKey = "product/seed/der-die-das-tablitza.pdf";
  // Валиден PDF, сглобен обект по обект с точни отмествания в xref —
  // иначе стриктни четци (не Preview) отказват файла.
  const stream =
    "BT /F1 24 Tf 72 770 Td (NFI - der/die/das) Tj ET\n" +
    "BT /F1 12 Tf 72 740 Td (Demo material - task 8 seed) Tj ET";
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R" +
      "/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>stream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\n` +
    `startxref\n${xrefAt}\n%%EOF`;
  await putObject("product", pdfKey, Buffer.from(pdf), "application/pdf");

  const materials = [
    {
      slug: "chlenovete-der-die-das",
      title: "Членовете der/die/das — веднъж завинаги",
      titleDe: "Die Artikel der/die/das — ein für alle Mal",
      titleEn: "The articles der/die/das — once and for all",
      description:
        "Кога е der, кога die и кога das — воден от логика и няколко работещи правила, не от зубрене.",
      descriptionDe:
        "Wann der, wann die, wann das — geleitet von Logik und ein paar handfesten Regeln, nicht vom Auswendiglernen.",
      descriptionEn:
        "When it's der, die or das — guided by logic and a few solid rules, not memorisation.",
      kind: "VIDEO_VIMEO" as const,
      externalId: "76979871",
      level: "A1" as const,
      sortOrder: 1,
    },
    {
      slug: "perfekt-za-40-minuti",
      title: "Perfekt за 40 минути",
      titleDe: "Das Perfekt in 40 Minuten",
      titleEn: "The Perfekt tense in 40 minutes",
      description:
        "Миналото време, което ползваш всеки ден: haben или sein, и къде отива причастието.",
      descriptionDe:
        "Die Vergangenheit für jeden Tag: haben oder sein, und wohin das Partizip gehört.",
      descriptionEn:
        "The past tense you use daily: haben or sein, and where the participle goes.",
      kind: "VIDEO_VIMEO" as const,
      externalId: "76979871",
      level: "A2" as const,
      sortOrder: 2,
    },
    {
      slug: "der-die-das-tablitza",
      title: "der/die/das — таблицата за стената",
      titleDe: "der/die/das — die Tabelle für die Wand",
      titleEn: "der/die/das — the wall chart",
      description:
        "Една страница с окончанията, които издават рода. Разпечатай я и я дръж пред очите си.",
      descriptionDe:
        "Eine Seite mit den Endungen, die das Genus verraten. Ausdrucken und vor Augen behalten.",
      descriptionEn:
        "One page with the endings that give away the gender. Print it and keep it in sight.",
      kind: "PDF" as const,
      storageKey: pdfKey,
      level: "A1" as const,
      sortOrder: 3,
    },
  ];

  for (const material of materials) {
    await db.freeMaterial.upsert({
      where: { slug: material.slug },
      update: {},
      create: { ...material, published: true, publishedAt: new Date() },
    });
  }
}

async function seedCertificates() {
  // Демо сертификат на курсиста, за да има какво да се види в профила,
  // в админа и на публичната проверка (/zertifikat/XK7M-2PQ9-WD4T).
  //
  // Номерът е от 2025 НАРОЧНО: истинската поредица (Counter
  // "certificate:2026") започва от NFI-Z-2026-00001 и фиксиран сийд номер
  // от 2026 би се сблъскал с първия истински. PDF файл не се прави тук —
  // route-ът за сваляне го генерира при първото поискване.
  const student = await db.user.findUnique({
    where: { email: "student@nfi.local" },
    select: { id: true },
  });
  const course = await db.course.findUnique({
    where: { slug: "deutsch-b1-online" },
    select: { id: true },
  });
  if (!student || !course) return;

  // Има ли ВЕЧЕ сертификат за тази двойка (например издаден на ръка през
  // админа при разработка), сийдът не пипа: create-ът би паднал на
  // unique(userId, courseId) и целият сийд би гръмнал.
  const existing = await db.certificate.findFirst({
    where: { userId: student.id, courseId: course.id },
    select: { id: true },
  });
  if (existing) return;

  await db.certificate.upsert({
    where: { number: "NFI-Z-2025-00001" },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
      number: "NFI-Z-2025-00001",
      holderName: "Max Mustermann",
      level: "B1",
      issuedAt: new Date("2025-12-19T10:00:00Z"),
      // Фиксиран код от азбуката на generateVerifyCode — за да е един и
      // същ на всяка машина и да може да се напише в документация.
      verifyCode: "XK7M-2PQ9-WD4T",
    },
  });
}

async function main() {
  assertNotProduction();

  const { admin } = await seedUsers();
  await seedCourses();
  await seedProducts();
  await seedMoreProducts();
  await seedLevelTest();
  await seedShipping();
  await seedDiscounts();
  // След курсовете: първата заявка се закача за „deutsch-b1-online".
  await seedCallRequests();
  await seedTranslations();
  await seedFreeMaterials();
  await seedCertificates();

  const counts = {
    потребители: await db.user.count(),
    курсове: await db.course.count(),
    продукти: await db.product.count(),
    "зони за доставка": await db.shippingZone.count(),
    отстъпки: await db.discount.count(),
    "въпроси в теста": await db.levelTestQuestion.count(),
    "заявки за обаждане": await db.callRequest.count(),
    "заявки за превод": await db.translationRequest.count(),
    "редактирани текстове": await db.contentBlock.count(),
    "безплатни материали": await db.freeMaterial.count(),
    сертификати: await db.certificate.count(),
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
