// Публичното сервиране на scope "media" — през директно извикване на GET.
//
// Най-важното твърдение е ОТРИЦАТЕЛНОТО: този route не е втори вход към
// платените файлове. Ключът се сглобява от сегментите СЛЕД /media, значи
// винаги започва с media/ — но path traversal и точки се проверяват
// изрично, защото един изпуснат случай тук струва цялата лийд фуния.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { putObject } from "@/lib/storage";
import { GET } from "./route";

let uploadsDir: string;

beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), "nfi-media-route-"));
  process.env.UPLOADS_DIR = uploadsDir;

  await putObject(
    "media",
    "media/2026/kartinka-ab12cd.png",
    new TextEncoder().encode("PNG-sadarzhanie"),
    "image/png",
  );
  await putObject(
    "product",
    "product/2026/plateno-cd34ef.pdf",
    new TextEncoder().encode("%PDF-plateno"),
    "application/pdf",
  );
});

afterAll(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(uploadsDir, { recursive: true, force: true });
});

function call(segments: string[]): Promise<Response> {
  return GET(new Request("http://localhost/media/" + segments.join("/")), {
    params: Promise.resolve({ key: segments }),
  });
}

describe("GET /media/[...key]", () => {
  it("сервира media ключ с immutable кеш и верния тип", async () => {
    const res = await call(["2026", "kartinka-ab12cd.png"]);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toBe("PNG-sadarzhanie");
  });

  it("НЕ е втори вход към платените файлове: ../product дава 404", async () => {
    const res = await call(["..", "product", "2026", "plateno-cd34ef.pdf"]);
    expect(res.status).toBe(404);
  });

  it("отказва и кодиран traversal (%2e%2e)", async () => {
    const res = await call(["%2e%2e", "product", "2026", "plateno-cd34ef.pdf"]);
    expect(res.status).toBe(404);
  });

  it("празен сегмент (media//x) дава 404", async () => {
    const res = await call(["", "x.png"]);
    expect(res.status).toBe(404);
  });

  it("липсващ обект дава 404, не 500", async () => {
    const res = await call(["2026", "nyama-takava.png"]);
    expect(res.status).toBe(404);
  });

  it("счупено кодиране (%zz) дава 404, не 500", async () => {
    const res = await call(["2026", "%zz.png"]);
    expect(res.status).toBe(404);
  });
});
