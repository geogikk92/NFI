// АДМИН · съобщението след действие, дошло през адреса.
//
// Защо през адреса, а не през състояние на формата: списъците имат по един
// бутон „Публикувай/Скрий" на РЕД. Отделно състояние за всеки ред би
// означавало клиентски компонент около всяка клетка на таблицата.
//
// Общо за трите списъка, защото проверката на ключа е мястото, където се
// греши: `query.greshka in MESSAGES` обхожда прототипната верига и
// „?greshka=toString" минава за валиден ключ. Един път написано правилно
// тук е по-добре от три пъти написано на ръка.

export type FlashQuery = Record<string, string | string[] | undefined>;

interface Props {
  query: FlashQuery;
  /** Ключ от адреса → съобщение за успех. */
  success: Record<string, string>;
  /** Стойност на „?greshka=" → съобщение за грешка. */
  errors?: Record<string, string>;
}

export function Flash({ query, success, errors = {} }: Props) {
  const errorKey = String(query.greshka ?? "");
  const error = Object.hasOwn(errors, errorKey) ? errors[errorKey] : null;

  const successKey = Object.keys(success).find(
    (key) => query[key] !== undefined,
  );
  const message = successKey ? success[successKey] : null;

  if (error) {
    return (
      // role="alert" прекъсва екранния четец: това е новина, която спира
      // работата. Успехът отдолу е role="status" — изчаква реда си.
      <p
        role="alert"
        className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        {error}
      </p>
    );
  }

  if (message) {
    return (
      <p
        role="status"
        className="mt-6 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
      >
        {message}
      </p>
    );
  }

  return null;
}

/** Грешките са едни и същи за трите обекта — само думата се сменя. */
export function commonFlashErrors(what: string): Record<string, string> {
  return {
    nyama: `${what} вече не съществува — някой го е изтрил междувременно.`,
    baza: "Промяната не мина заради грешка в базата. Опитай пак.",
  };
}
