// Изборът на драйвер — единственото решение на този модул.
//
// Три състояния: без S3_* (локален диск), пълен набор (S3 през fetch),
// НЕПЪЛЕН набор (пак локален — това е промяната от 17m-b: по-рано
// bucket без endpoint се броеше за „конфигуриран S3" и заявките биха
// тръгнали към AWS вместо към R2).

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  head,
  isSafeKey,
  newObjectKey,
  putObject,
  readObject,
  remove,
  s3Configured,
  signedUrl,
} from "./index";

const S3_ENV = {
  S3_ENDPOINT: "https://acc.eu.r2.cloudflarestorage.com",
  S3_BUCKET: "nfi-files",
  S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
  S3_SECRET_ACCESS_KEY: "secret",
} as const;

let uploadsDir: string;

beforeEach(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), "nfi-storage-"));
  process.env.UPLOADS_DIR = uploadsDir;
});

afterEach(async () => {
  delete process.env.UPLOADS_DIR;
  for (const name of Object.keys(S3_ENV)) delete process.env[name];
  vi.unstubAllGlobals();
  await rm(uploadsDir, { recursive: true, force: true });
});

describe("s3Configured", () => {
  it("иска и endpoint, не само bucket и ключове", () => {
    expect(s3Configured()).toBe(false);

    Object.assign(process.env, S3_ENV);
    expect(s3Configured()).toBe(true);

    delete process.env.S3_ENDPOINT;
    expect(s3Configured()).toBe(false);
  });
});

describe("без S3_* — локалният драйвер", () => {
  it("пълният цикъл put → head → read → remove работи на диска", async () => {
    const body = new TextEncoder().encode("proba");
    const stored = await putObject("media", "media/2026/t-ab12cd.txt", body, "text/plain");
    expect(stored.sizeBytes).toBe(5);

    expect((await head("media/2026/t-ab12cd.txt"))?.mimeType).toBe("text/plain");
    expect((await readObject("media/2026/t-ab12cd.txt"))?.body.toString()).toBe("proba");
    expect(await remove("media/2026/t-ab12cd.txt")).toBe(true);
    expect(await head("media/2026/t-ab12cd.txt")).toBeNull();
  });

  it("signedUrl дава относителен път през /api/storage", async () => {
    expect(await signedUrl("media/2026/t.txt")).toMatch(/^\/api\/storage\?key=/);
  });
});

describe("с пълен S3_* — S3 драйверът", () => {
  beforeEach(() => {
    Object.assign(process.env, S3_ENV);
  });

  it("readObject тръгва към bucket-а, не към диска", async () => {
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response("s3-sadarzhanie", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const object = await readObject("media/2026/t-ab12cd.txt");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://acc.eu.r2.cloudflarestorage.com/nfi-files/media/2026/t-ab12cd.txt",
    );
    expect(object?.body.toString()).toBe("s3-sadarzhanie");
  });

  it("signedUrl дава абсолютен presigned адрес", async () => {
    const url = await signedUrl("document/2026/z.pdf");
    expect(url).toMatch(/^https:\/\/acc\.eu\.r2\.cloudflarestorage\.com\//);
    expect(url).toContain("X-Amz-Signature=");
  });

  it("при НЕПЪЛЕН набор пада към локалния драйвер", async () => {
    delete process.env.S3_ENDPOINT;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await putObject(
      "media",
      "media/2026/lokal-ab12cd.txt",
      new TextEncoder().encode("x"),
      "text/plain",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await readObject("media/2026/lokal-ab12cd.txt"))?.body.toString()).toBe("x");
  });
});

describe("договорът, който важи и за двата драйвера", () => {
  it("putObject отказва ключ извън scope-а", async () => {
    await expect(
      putObject("media", "product/2026/x.pdf", new Uint8Array(1), "application/pdf"),
    ).rejects.toThrow("scope");
  });

  it("isSafeKey се изнася оттук (ползва го и валидацията на админа)", () => {
    expect(isSafeKey("media/2026/x-ab12cd.png")).toBe(true);
    expect(isSafeKey("media/../etc/passwd")).toBe(false);
  });

  it("newObjectKey дава ключ в scope-а със суфикс", () => {
    const key = newObjectKey("media", "Василена в клас", "png");
    expect(key).toMatch(/^media\/\d{4}\/[a-z0-9-]*-[a-z0-9]{6}\.png$/);
  });
});
