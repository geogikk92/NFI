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

async function seedUsers() {
  const admin = await db.user.upsert({
    where: { email: "admin@nfi.local" },
    update: {},
    create: {
      email: "admin@nfi.local",
      name: "Василена",
      role: "ADMIN",
      locale: "bg",
      emailVerified: new Date(),
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
    },
  });

  return { admin, student };
}

async function seedCourses() {
  const courses = [
    {
      slug: "deutsch-a1-abendkurs",
      title: "Немски A1 · вечерен курс",
      titleDe: "Deutsch A1 · Abendkurs",
      level: "A1" as const,
      format: "PRESENCE" as const,
      summary: "За начинаещи без предварителни знания.",
      summaryDe: "Für Anfänger ohne Vorkenntnisse.",
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
      level: "B1" as const,
      format: "ONLINE" as const,
      summary: "Онлайн курс с преподавател на живо.",
      summaryDe: "Онлайн-Kurs mit Lehrkraft in Echtzeit.",
      priceCents: 45000,
      durationWeeks: 10,
      hoursPerWeek: 4,
      sortOrder: 2,
    },
    {
      slug: "pruefungsvorbereitung-b2",
      title: "Подготовка за изпит B2",
      titleDe: "Prüfungsvorbereitung B2",
      level: "B2" as const,
      format: "HYBRID" as const,
      summary: "Целенасочена подготовка за сертификатния изпит.",
      summaryDe: "Gezielte Vorbereitung auf die Zertifikatsprüfung.",
      priceCents: 52000,
      durationWeeks: 8,
      hoursPerWeek: 6,
      sortOrder: 3,
    },
  ];

  for (const course of courses) {
    await db.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: { ...course, published: true, publishedAt: new Date() },
    });
  }
}

async function seedProducts() {
  // Дигитален: подлежи на Widerruf съгласие преди сваляне (§356 Abs. 5).
  const workbook = await db.product.upsert({
    where: { slug: "arbeitsheft-a1-pdf" },
    update: {},
    create: {
      slug: "arbeitsheft-a1-pdf",
      title: "Работна тетрадка A1 (PDF)",
      titleDe: "Arbeitsheft A1 (PDF)",
      type: "DIGITAL",
      priceCents: 1200,
      vatRate: "20.00",
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
    update: {},
    create: {
      slug: "lehrbuch-a1",
      title: "Учебник A1 (печатно издание)",
      titleDe: "Lehrbuch A1 (gedruckt)",
      type: "PHYSICAL",
      priceCents: 2800,
      vatRate: "20.00",
      weightGrams: 450,
      stock: 25,
      published: true,
      publishedAt: new Date(),
      sortOrder: 2,
    },
  });
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
  await seedShipping();
  await seedDiscounts();
  await seedPages();

  const counts = {
    потребители: await db.user.count(),
    курсове: await db.course.count(),
    продукти: await db.product.count(),
    "зони за доставка": await db.shippingZone.count(),
    отстъпки: await db.discount.count(),
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
