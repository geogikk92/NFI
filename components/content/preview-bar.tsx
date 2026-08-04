// ЛЕНТА „ГЛЕДАШ ЧЕРНОВА" · задача 18c.
//
// Без нея preview режимът е капан: бисквитката живее, докато не бъде
// изключена, и Василена ще гледа чернови дни наред, чудейки се защо
// сайтът показва нещо, което не е публикувала.
//
// Лентата стои НАД съдържанието, в цвят, който не прилича на дизайна —
// целта ѝ е да пречи, не да се слее.

import { disablePreview } from "@/app/admin/tekstove/actions";

export function PreviewBar() {
  return (
    <div className="border-b-2 border-warning bg-warning/15 px-6 py-2.5">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Гледаш ЧЕРНОВА. Посетителите виждат публикуваното.
        </p>
        <form action={disablePreview}>
          <button
            type="submit"
            className="text-sm font-semibold underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Изход от прегледа
          </button>
        </form>
      </div>
    </div>
  );
}
