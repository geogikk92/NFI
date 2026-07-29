# NFI · Сайт на Nürnberger Fremdsprachen Institut

Приложението (Next.js). Клиентският мокъп живее отделно в
[`nfi-website-mockup`](https://github.com/BorisGudev/nfi-website-mockup) и **не се пипа** —
той е живото демо, което се показва на клиентката.

**Екип:** Боби (`@BorisGudev`) · Жоро (`@ЖОРО-GITHUB`)
**План:** [`docs/ПЛАН.md`](docs/ПЛАН.md) — 939 ч, Боби 471 / Жоро 468, ~17 седмици

---

## Как работим заедно

Целта е да работим **едновременно, без да се чакаме**. Това се постига с три правила.

### 1. Всеки пипа само своята територия

| Боби | Жоро |
|---|---|
| `app/(public)/`, `app/(profile)/` | `app/(shop)/`, `app/(translate)/` |
| `app/admin/(content)/` | `app/admin/(commerce)/` |
| `app/globals.css`, `components/content/` | `components/commerce/` |
| `lib/cms/`, `lib/storage/` | `lib/payments/`, `lib/email/`, `lib/nap/` |
| `prisma/schema/content.prisma` | `prisma/schema/commerce.prisma` |

`lib/storage`, `lib/email` и `lib/payments` вече съществуват като
**сигнатури с mock тяло**. Кодирай срещу тях от днес; собственикът ги
запълва по график. Mock-ът хвърля с ясно съобщение кой я дължи и кога.

### 2. Общите файлове са ЗАМРАЗЕНИ след ден 1

```
prisma/schema/base.prisma   app/layout.tsx   app/tokens.css   components/ui/
lib/db.ts   lib/money.ts   lib/counter.ts
```

Промяна в тях минава през PR с ревю от другия (виж `.github/CODEOWNERS`).
Ако ти трябва нов споделен примитив — пишеш на другия, получаваш го до 24 ч.

> **Защо `app/tokens.css`, а не `tailwind.config.ts`:** Tailwind v4 държи
> токените в CSS, конфигурационен файл няма. Затова договорката е в
> `app/tokens.css` (замразен), а `app/globals.css` остава свободна
> територия на Боби.

### Как работят цветовете

`app/tokens.css` захранва shadcn речника с палитрата на NFI. На практика:

```tsx
<Button>Плати</Button>              // вече е в червеното на NFI
<p className="text-muted-foreground">…</p>
```

Жоро пише стандартни shadcn класове и не мисли за цветове. Когато Боби
завърти палитрата в `tokens.css`, магазинът се променя с нея.
Суровите скали (`bg-nfi-red-600`, `text-ink-700`, `bg-nfi-gold-400`) са
на разположение, но семантичните класове са за предпочитане.

### 3. Клонове и PR

```bash
git checkout -b bobi/17a-admin-skele      # или zhoro/M10-checkout
# ... работа ...
git push -u origin bobi/17a-admin-skele
gh pr create --fill
```

- Име на клона: `bobi/<номер-задача>-<кратко>` или `zhoro/<номер>-<кратко>`
- В своята територия: мърджваш сам, без ревю
- В общите четири файла: чака ревю от другия
- Мърджвай в `main` често (поне 2×/седмица), за да не се разминете

---

## Стартиране

```bash
npm install
cp .env.example .env.local     # попълни поне DATABASE_URL
npx prisma generate            # клиентът отива в app/generated/prisma
npx prisma migrate dev         # изисква работеща база
npm run dev
```

Схемата е **многофайлова** (`prisma/schema/`). Prisma CLI чете `.env.local`
през `prisma.config.ts` — само един файл с тайни, за Next и за Prisma.

## Стек

Next.js 15 (App Router) · TypeScript · **Tailwind v4** · shadcn/ui (Radix) ·
**Prisma 7** (driver adapter, не Rust engine) · PostgreSQL · Auth.js v5 ·
**Mollie** · Resend / React Email · S3/R2 · pdf-lib · Vercel EU

> Prisma 7 работи през `@prisma/adapter-pg`. `new PrismaClient()` без adapter
> не тръгва — ползвай `db` от [`lib/db.ts`](lib/db.ts), не си прави втори клиент.

## Ключови решения

- **Юридическо лице: българско** → НАП/Наредба Н-18 важи; фактури по ЗДДС, не §14 UStG
- **Klarna през Mollie**, не през Stripe (България не е поддържана merchant държава в Stripe)
- Клиентите са в Германия → важи немската потребителска защита (14-дневен отказ) + ДДС OSS

## Ритъм

20-минутен синхрон в **понеделник и петък**.
