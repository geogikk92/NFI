// S3/R2 драйверът със стъб-fetch — всяка заявка се записва и проверява
// байт по байт, без реален bucket.
//
// Стъбът е целият механизъм за тестване: подписът вече е доказан срещу
// официалните вектори (sigv4.test.ts), тук се доказва, че драйверът
// (а) строи правилната заявка и (б) спазва договора за грешки, на който
// разчитат свалянето на материали и сертификатите: 404 → null, 403 →
// хвърля, тялото е истински Buffer.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { s3Head, s3Put, s3Read, s3Remove, s3SignedUrl } from "./s3";

const ENV = {
  S3_ENDPOINT: "https://0123456789abcdef.eu.r2.cloudflarestorage.com",
  S3_BUCKET: "nfi-files",
  S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
  S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
} as const;

beforeEach(() => {
  Object.assign(process.env, ENV);
});

afterEach(() => {
  for (const name of Object.keys(ENV)) delete process.env[name];
});

/** Стъб, който записва заявката и връща каквото му е зададено. */
function recordingFetch(response: Response) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, impl };
}

function headersOf(init: RequestInit | undefined): Record<string, string> {
  return (init?.headers ?? {}) as Record<string, string>;
}

describe("формата на заявката", () => {
  it("адресира path-style и подписва точния host", async () => {
    const { calls, impl } = recordingFetch(
      new Response(null, { status: 200, headers: { "content-length": "5" } }),
    );

    await s3Head("media/2026/kartinka-ab12cd.png", impl);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://0123456789abcdef.eu.r2.cloudflarestorage.com/nfi-files/media/2026/kartinka-ab12cd.png",
    );

    const headers = headersOf(calls[0].init);
    expect(headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    // Празно тяло → hash на празното.
    expect(headers["x-amz-content-sha256"]).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("хвърля ясна грешка при непълна конфигурация", async () => {
    delete process.env.S3_ENDPOINT;
    await expect(s3Head("media/2026/x.png")).rejects.toThrow("S3_ENDPOINT");
  });
});

describe("договорът за грешки", () => {
  it("404 → null за head и readObject", async () => {
    const notFound = () => new Response("<Error/>", { status: 404 });
    expect(await s3Head("media/2026/nyama.png", async () => notFound())).toBeNull();
    expect(await s3Read("media/2026/nyama.png", async () => notFound())).toBeNull();
  });

  it("404 → true за remove: целта „да го няма“ е постигната", async () => {
    expect(
      await s3Remove("media/2026/nyama.png", async () => new Response(null, { status: 404 })),
    ).toBe(true);
  });

  it("403 → хвърля и казва за правата, не се преструва на липсващ файл", async () => {
    const denied = async () => new Response("<Error/>", { status: 403 });
    await expect(s3Read("media/2026/x.png", denied)).rejects.toThrow("права");
    await expect(s3Head("media/2026/x.png", denied)).rejects.toThrow("права");
    await expect(s3Remove("media/2026/x.png", denied)).rejects.toThrow("права");
  });

  it("500 → хвърля с кода", async () => {
    await expect(
      s3Read("media/2026/x.png", async () => new Response("boom", { status: 500 })),
    ).rejects.toThrow("HTTP 500");
  });
});

describe("readObject", () => {
  it("връща истински Buffer — subarray().toString() дава %PDF-", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7 останалото");
    const { impl } = recordingFetch(
      new Response(pdf, { status: 200, headers: { "content-type": "application/pdf" } }),
    );

    const object = await s3Read("document/2026/zertifikat-x.pdf", impl);

    expect(object).not.toBeNull();
    // Точно операциите, които правят потребителите на readObject:
    expect(object!.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(String(object!.body.length)).toBe(String(pdf.length));
    expect(object!.mimeType).toBe("application/pdf");
  });
});

describe("putObject", () => {
  it("праща тялото с content-type и реален sha256 в метаданните", async () => {
    const body = new TextEncoder().encode("nachalo-na-kartinka");
    const { calls, impl } = recordingFetch(new Response(null, { status: 200 }));

    const stored = await s3Put("media/2026/k-ab12cd.png", body, "image/png", impl);

    const headers = headersOf(calls[0].init);
    expect(calls[0].init?.method).toBe("PUT");
    expect(headers["content-type"]).toBe("image/png");
    // x-amz-content-sha256 (подписаният hash) и x-amz-meta-sha256
    // (метаданните) са ЕДНА И СЪЩА стойност — реалният хеш на тялото.
    expect(headers["x-amz-meta-sha256"]).toBe(headers["x-amz-content-sha256"]);
    expect(headers["x-amz-meta-sha256"]).toMatch(/^[0-9a-f]{64}$/);
    // content-type участва в подписа.
    expect(headers.authorization).toContain("content-type;host;x-amz-content-sha256");

    expect(stored.sizeBytes).toBe(body.length);
    expect(stored.checksum).toBe(headers["x-amz-meta-sha256"]);
  });
});

describe("s3SignedUrl", () => {
  it("дава абсолютен presigned адрес с валидна форма", () => {
    const url = s3SignedUrl("document/2026/zertifikat-x.pdf", 300);

    expect(url).toMatch(
      /^https:\/\/0123456789abcdef\.eu\.r2\.cloudflarestorage\.com\/nfi-files\/document\/2026\/zertifikat-x\.pdf\?/,
    );
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Expires=300");
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });

  it("пренася кирилското име за сваляне по RFC 5987", () => {
    const url = s3SignedUrl("product/2026/tablitza-ab12cd.pdf", 300, "Таблица.pdf");

    // Име в UTF-8'' форма, кодирано в query стойността. Двойно кодиране:
    // веднъж encodeURIComponent за RFC 5987, втори път uriEncode за
    // canonical query — затова %D0 става %25D0.
    expect(url).toContain(
      "response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25D0%25A2%25D0%25B0%25D0%25B1%25D0%25BB%25D0%25B8%25D1%2586%25D0%25B0.pdf",
    );
  });
});
