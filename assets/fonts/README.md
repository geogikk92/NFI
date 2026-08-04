# Шрифтове за PDF генерацията (задача 16)

Статични TTF копия на шрифтовете на сайта, вграждани в PDF сертификатите.
Сайтът ги зарежда през `next/font/google`; PDF-ът няма как — на него му
трябва физически файл, който `@pdf-lib/fontkit` да вгради в документа.

| Файл | Източник | Лиценз |
|---|---|---|
| Oswald-Medium.ttf, Oswald-SemiBold.ttf | Google Fonts, Oswald v57 | OFL 1.1 |
| Inter-Regular.ttf, Inter-SemiBold.ttf | Google Fonts, Inter v20 | OFL 1.1 |

И четирите са проверени за пълно покритие на кирилица (ж, щ, ю, №) и
немски (ä, ö, ü, ß) — тестът в `lib/certificates/pdf.test.ts` пази това
твърдение постоянно.

SIL Open Font License 1.1 позволява вграждане и разпространение;
не позволява продажба на самите файлове самостоятелно.
https://openfontlicense.org
