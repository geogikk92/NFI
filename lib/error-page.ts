// ОБЩ ФАЙЛ · мини-екранът за грешки на route handlers.
//
// Свалянията (/download/[token], /api/certificate/[id]) не са страници:
// нямат locale в адреса и не минават през layout-а. Съобщенията са на
// трите езика наведнъж — кратки са, а излишният език не пречи, липсващият
// пречи. До 04.08.2026 този HTML живееше копиран в двата route-а;
// разминаха се още на втория ден, затова е тук.

interface MiniErrorPageOptions {
  /** Накъде води връзката долу. По подразбиране началото. */
  linkHref?: string;
  /** Надписът ѝ. По подразбиране „nfi". */
  linkLabel?: string;
}

/**
 * Един и същ екран за трите езика: flagline, съобщенията, връзка.
 * `messages` идва в ред bg, de, en — както са локалите в LOCALES.
 */
export function miniErrorPage(
  status: number,
  messages: readonly string[],
  options: MiniErrorPageOptions = {},
): Response {
  const { linkHref = "/", linkLabel = "nfi" } = options;

  const html = `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>NFI</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f7f5f0;color:#16130f;
    display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
  main{max-width:34rem}
  .line{height:3px;background:linear-gradient(90deg,#16130f 0 16.66%,#c11f2f 16.66% 33.32%,#b98a2b 33.32% 49.98%,#fff 49.98% 66.64%,#2f7d5b 66.64% 83.3%,#c11f2f 83.3% 100%);margin-bottom:20px}
  p{line-height:1.55;margin:0 0 12px}
  p+p{color:#57503f;font-size:.9rem}
  a{color:#c11f2f}
</style>
</head>
<body><main>
<div class="line"></div>
${messages.map((m, i) => `<p${i > 0 ? ' lang="' + ["bg", "de", "en"][i] + '"' : ""}>${m}</p>`).join("\n")}
<p><a href="${linkHref}">${linkLabel}</a></p>
</main></body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
