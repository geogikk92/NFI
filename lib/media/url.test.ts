// mediaUrl — единственият вход за адреси на публични изображения.

import { describe, expect, it } from "vitest";
import { mediaUrl } from "./url";

describe("mediaUrl", () => {
  it("ключът media/… става адрес /media/… без дублиране на scope-а", () => {
    expect(mediaUrl("media/2026/kartinka-ab12cd.png")).toBe(
      "/media/2026/kartinka-ab12cd.png",
    );
  });

  it("отказва ключ извън scope media — платеното минава през signedUrl", () => {
    expect(() => mediaUrl("product/2026/tablitza.pdf")).toThrow("media");
    expect(() => mediaUrl("document/2026/zertifikat.pdf")).toThrow("media");
  });

  it("кодира сегментите поотделно, без да пипа наклонените черти", () => {
    expect(mediaUrl("media/2026/a b.png")).toBe("/media/2026/a%20b.png");
  });
});
