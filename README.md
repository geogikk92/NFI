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
| `components/ui/`, `components/content/` | `components/commerce/` |
| `lib/cms/`, `lib/storage/` | `lib/payments/`, `lib/email/`, `lib/nap/` |
| `prisma/schema/content.prisma` | `prisma/schema/commerce.prisma` |

### 2. Четири файла са общи и ЗАМРАЗЕНИ след ден 1

```
prisma/schema/base.prisma   app/layout.tsx   tailwind.config.ts   components/ui/
```

Промяна в тях минава през PR с ревю от другия (виж `.github/CODEOWNERS`).
Ако ти трябва нов споделен примитив — пишеш на другия, получаваш го до 24 ч.

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
cp .env.example .env.local     # попълни стойностите
npx prisma migrate dev
npm run dev
```

## Стек

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma · PostgreSQL ·
Auth.js v5 · **Mollie** · Resend / React Email · S3/R2 · pdf-lib · Vercel EU

## Ключови решения

- **Юридическо лице: българско** → НАП/Наредба Н-18 важи; фактури по ЗДДС, не §14 UStG
- **Klarna през Mollie**, не през Stripe (България не е поддържана merchant държава в Stripe)
- Клиентите са в Германия → важи немската потребителска защита (14-дневен отказ) + ДДС OSS

## Ритъм

20-минутен синхрон в **понеделник и петък**.
