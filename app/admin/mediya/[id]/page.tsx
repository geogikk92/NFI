// АДМИН · един файл от медийната библиотека.
//
// Двуколонен редакторски изглед: вляво самото изображение и фактите за
// него, вдясно — единствените редактируеми полета (описания и заглавие).
// Изтриването е долу, сгънато, и се БЛОКИРА с обяснение, когато файлът е
// закачен като корица: изтрит Media ред би оставил coverMediaId, който
// сочи в нищото (няма foreign key — нарочно), и публичната страница
// остава без корица без нито едно съобщение.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSection } from "@/components/admin/delete-section";
import { Flash } from "@/components/admin/flash";
import { MediaForm } from "@/components/admin/media-form";
import { requireAdmin } from "@/lib/admin/guard";
import { getMediaForEdit, mediaUsage, usageCount } from "@/lib/admin/media";
import { mediaUrl } from "@/lib/media/url";
import { formatDate, toDateTimeAttribute } from "@/lib/intl";
import { removeMedia, saveMediaMeta } from "../actions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Файл",
  robots: { index: false, follow: false },
};

const FLASH = {
  kachen: "Файлът е качен. Допълни описанието за екранен четец, преди да го закачиш някъде.",
};

/** Адресите на записите, които ползват файла. */
const USAGE_HREF = {
  course: "/admin/kursove",
  product: "/admin/produkti",
  material: "/admin/materiali",
} as const;

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaDetailPage({
  params,
  searchParams,
}: Props & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const { id } = await params;
  const query = await searchParams;

  const media = await getMediaForEdit(id);
  if (!media) notFound();

  const usage = await mediaUsage(id);
  const used = usageCount(usage) > 0;

  const usageLinks = [
    ...usage.courses.map((item) => ({ ...item, kind: "course" as const })),
    ...usage.products.map((item) => ({ ...item, kind: "product" as const })),
    ...usage.materials.map((item) => ({ ...item, kind: "material" as const })),
  ];

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/mediya" className="underline hover:text-primary">
          Медия
        </Link>
        <span aria-hidden> › </span>
        <span>{media.title ?? media.key.split("/").pop()}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight break-all">
          {media.title ?? media.key.split("/").pop()}
        </h1>
      </header>

      <Flash query={query} success={FLASH} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <section aria-label="Изображение и данни">
          {/* Естествено съотношение върху дискретен фон — тук се гледа
              самата снимка, не изрязана миниатюра. */}
          <div className="rounded-xl border border-border bg-surface-sunken p-4">
            <Image
              src={mediaUrl(media.key)}
              alt={media.alt ?? ""}
              width={media.width ?? 800}
              height={media.height ?? 600}
              className="mx-auto h-auto max-h-[420px] w-auto max-w-full rounded-md"
              sizes="(min-width: 1024px) 40rem, 100vw"
            />
          </div>

          <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Ключ</dt>
            <dd className="break-all font-mono text-xs leading-5">
              {/* Показан, но НЕ редактируем: ключът е адресът на файла в
                  хранилището — смяната му не мести обекта. */}
              {media.key}
            </dd>

            <dt className="text-muted-foreground">Тип</dt>
            <dd>{media.mimeType}</dd>

            <dt className="text-muted-foreground">Размери</dt>
            <dd className="tabular-nums">
              {media.width && media.height
                ? `${media.width} × ${media.height} px`
                : "неизвестни"}
            </dd>

            <dt className="text-muted-foreground">Тегло</dt>
            <dd>{fileSize(media.sizeBytes)}</dd>

            <dt className="text-muted-foreground">Качен на</dt>
            <dd>
              <time dateTime={toDateTimeAttribute(media.createdAt)}>
                {formatDate(media.createdAt, "bg")}
              </time>
            </dd>

            <dt className="text-muted-foreground">Ползва се в</dt>
            <dd>
              {usageLinks.length === 0 ? (
                <span className="text-muted-foreground">никъде още</span>
              ) : (
                <ul className="grid gap-0.5">
                  {usageLinks.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href={`${USAGE_HREF[item.kind]}/${item.id}`}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        </section>

        <section aria-label="Редакция">
          <MediaForm
            action={saveMediaMeta}
            media={{
              id: media.id,
              alt: media.alt,
              altDe: media.altDe,
              title: media.title,
            }}
          />
        </section>
      </div>

      <DeleteSection
        action={removeMedia}
        id={media.id}
        what="файла"
        consequence="Изображението изчезва от библиотеката и от хранилището. Връзки към него в имейли или външни страници спират да работят."
        blocked={
          used
            ? "Файлът е закачен като корица на записите по-горе (виж „Ползва се в“). Махни го оттам и се върни — иначе публичната страница остава със счупена картинка."
            : null
        }
      />
    </>
  );
}
