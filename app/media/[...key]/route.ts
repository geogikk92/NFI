// ТЕРИТОРИЯ НА БОБИ · задача 17m-b — публично сервиране на scope "media".
//
// Сервира САМО ключове с префикс media/ — публичните изображения.
// Product, translation и document остават зад подписани линкове
// (app/api/storage) — този route НЕ Е втори вход към платено съдържание:
// адрес като /media/../product/x.pdf се отказва от isSafeKey, а ключ,
// започващ с друг scope, изобщо не се образува тук (пътят започва с
// /media, значи ключът започва с media/).
//
// Кешът е агресивен НАРОЧНО: immutable + една година. Безопасно е,
// защото ключовете са immutable по конструкция (newObjectKey слепва
// случаен суфикс — един ключ = едно съдържание завинаги). Точно това
// прави next/image икономичен: стабилен href = стабилен кешов ключ.
//
// Чете през readObject(), значи работи и с двата драйвера — локалният
// диск днес, R2 утре, без промяна тук.

import { readObject, isSafeKey } from "@/lib/storage";

type Props = { params: Promise<{ key: string[] }> };

function notFound(): Response {
  return new Response(
    "Файлът не е намерен. / Datei nicht gefunden. / File not found.",
    {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
}

export async function GET(
  _request: Request,
  { params }: Props,
): Promise<Response> {
  const segments = (await params).key;

  // Сегментът /media от адреса Е scope-ът на ключа — сглобява се обратно.
  const key = "media/" + segments.map(decodeSegment).join("/");

  // Едно и също 404 за опасен ключ и за липсващ файл: разликата би
  // казала на опипващия кое от двете е познал.
  if (segments.length === 0 || !isSafeKey(key)) return notFound();

  const object = await readObject(key);
  if (!object) return notFound();

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "content-type": object.mimeType,
      "content-length": String(object.body.length),
      // immutable: браузърът не пита втори път, /_next/image кешира
      // трансформацията за година. Ново съдържание = нов ключ.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Next подава сегментите СУРОВИ или кодирани според клиента — decode с
 * try/catch, защото „%zz" в адреса хвърля URIError, а битият адрес е
 * 404, не 500.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
