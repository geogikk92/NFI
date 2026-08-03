import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isSafeKey,
  localHead,
  localPut,
  localRead,
  localRemove,
  localSignedPath,
  verifySignedParams,
} from "./local";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nfi-storage-"));
  process.env.UPLOADS_DIR = dir;
});

afterAll(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("безопасни ключове", () => {
  it("приема нормалните ключове", () => {
    expect(isSafeKey("media/2026/portret-a1b2c3.jpg")).toBe(true);
    expect(isSafeKey("document/2026/faktura-000123.pdf")).toBe(true);
  });

  it("отхвърля изкачване по директориите", () => {
    expect(isSafeKey("../etc/passwd")).toBe(false);
    expect(isSafeKey("media/../../secret")).toBe(false);
    expect(isSafeKey("/etc/passwd")).toBe(false);
  });

  it("отхвърля празното и екзотиката", () => {
    expect(isSafeKey("")).toBe(false);
    expect(isSafeKey("media//x")).toBe(false);
    expect(isSafeKey("ключ-на-кирилица")).toBe(false);
  });
});

describe("качване, четене, изтриване", () => {
  const KEY = "product/2026/test-abc123.pdf";
  const BODY = Buffer.from("%PDF-1.4 тест");

  it("пълен кръг: put → head → read → remove", async () => {
    const put = await localPut(KEY, BODY, "application/pdf");
    expect(put.sizeBytes).toBe(BODY.length);
    expect(put.checksum).toHaveLength(64);

    const head = await localHead(KEY);
    expect(head?.mimeType).toBe("application/pdf");
    expect(head?.sizeBytes).toBe(BODY.length);

    const read = await localRead(KEY);
    expect(read?.body.equals(BODY)).toBe(true);
    expect(read?.mimeType).toBe("application/pdf");

    expect(await localRemove(KEY)).toBe(true);
    expect(await localHead(KEY)).toBeNull();
  });

  it("липсващото дава null, не грешка", async () => {
    expect(await localHead("media/2026/nyama.jpg")).toBeNull();
    expect(await localRead("media/2026/nyama.jpg")).toBeNull();
  });

  it("изтриване на липсващото пак е успех — целта е постигната", async () => {
    expect(await localRemove("media/2026/nikoga.jpg")).toBe(true);
  });
});

describe("подписани линкове", () => {
  const KEY = "product/2026/podpisan-test.pdf";

  function paramsOf(url: string) {
    const parsed = new URL(url, "http://localhost");
    return {
      key: parsed.searchParams.get("key"),
      exp: parsed.searchParams.get("exp"),
      sig: parsed.searchParams.get("sig"),
      dl: parsed.searchParams.get("dl"),
    };
  }

  it("валидният подпис минава и носи името за сваляне", () => {
    const url = localSignedPath(KEY, 300, "Граматика.pdf");
    const verified = verifySignedParams(paramsOf(url));
    expect(verified?.key).toBe(KEY);
    expect(verified?.downloadAs).toBe("Граматика.pdf");
  });

  it("пипнат ключ пада — подписът пази ЦЕЛИЯ товар", () => {
    const url = localSignedPath(KEY, 300);
    const params = paramsOf(url);
    params.key = "product/2026/drug-fail.pdf";
    expect(verifySignedParams(params)).toBeNull();
  });

  it("пипнато име за сваляне също пада", () => {
    const url = localSignedPath(KEY, 300, "original.pdf");
    const params = paramsOf(url);
    params.dl = "podmenen.pdf";
    expect(verifySignedParams(params)).toBeNull();
  });

  it("изтеклият срок пада", () => {
    const url = localSignedPath(KEY, -10);
    expect(verifySignedParams(paramsOf(url))).toBeNull();
  });

  it("липсващ параметър пада тихо", () => {
    expect(
      verifySignedParams({ key: KEY, exp: null, sig: "x", dl: null }),
    ).toBeNull();
  });
});
