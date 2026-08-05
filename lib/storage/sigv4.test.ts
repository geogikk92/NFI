// Подписът SigV4 срещу ОФИЦИАЛНИТЕ вектори на AWS.
//
// Всеки тест е замразен (метод, адрес, headers, дата, ключове) → очакван
// подпис. Източниците са два: aws-sig-v4-test-suite (генеричните правила
// на алгоритъма) и примерите от S3 API Reference (S3 спецификата:
// UNSIGNED-PAYLOAD, еднократно кодиране, без нормализация на пътя).
// Трите R2 вектора накрая са собствени, изчислени с реализация, която
// минава всички официални — пазят НАШАТА форма (auto регион, path-style,
// кирилица в ключа) от регресия.

import { describe, expect, it } from "vitest";
import {
  EMPTY_SHA256,
  hexSha256,
  signHeaders,
  signQuery,
  toAmzDate,
  uriEncode,
} from "./sigv4";

// Ключовете от официалните примери — отдавна публични и невалидни.
const SUITE = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "service",
};

const S3_DOCS = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "s3",
};

const R2 = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "auto",
  service: "s3",
};

const R2_HOST = "0123456789abcdef0123456789abcdef.eu.r2.cloudflarestorage.com";

/** Подписът е последното поле на Authorization — сравняваме само него. */
function extractSignature(authorization: string): string {
  return authorization.split("Signature=")[1];
}

describe("uriEncode", () => {
  it("кодира по RFC 3986, не по encodeURIComponent", () => {
    // Петте знака, които encodeURIComponent пропуска.
    expect(uriEncode("!'()*")).toBe("%21%27%28%29%2A");
    expect(uriEncode("test$file.text")).toBe("test%24file.text");
    // Интервалът е %20, никога "+".
    expect(uriEncode("a b")).toBe("a%20b");
    // Кирилицата се кодира байт по байт от UTF-8, с главни цифри.
    expect(uriEncode("фактура №5")).toBe(
      "%D1%84%D0%B0%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%E2%84%965",
    );
    expect(uriEncode("A-Za-z0-9-_.~")).toBe("A-Za-z0-9-_.~");
  });
});

describe("toAmzDate", () => {
  it("дава точно 16 знака UTC", () => {
    expect(toAmzDate(new Date("2026-08-05T12:00:00.123Z"))).toBe(
      "20260805T120000Z",
    );
  });
});

describe("aws-sig-v4-test-suite (генеричните правила)", () => {
  it("get-vanilla: най-простата заявка", () => {
    const auth = signHeaders({
      method: "GET",
      host: "example.amazonaws.com",
      rawPath: "/",
      headers: [["x-amz-date", "20150830T123600Z"]],
      payloadHash: EMPTY_SHA256,
      amzDate: "20150830T123600Z",
      credentials: SUITE,
    });
    expect(extractSignature(auth)).toBe(
      "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("get-vanilla-query-order-key-case: query се сортира по кодиран ключ", () => {
    const auth = signHeaders({
      method: "GET",
      host: "example.amazonaws.com",
      rawPath: "/",
      query: [
        ["Param2", "value2"],
        ["Param1", "value1"],
      ],
      headers: [["x-amz-date", "20150830T123600Z"]],
      payloadHash: EMPTY_SHA256,
      amzDate: "20150830T123600Z",
      credentials: SUITE,
    });
    expect(extractSignature(auth)).toBe(
      "b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
    );
  });

  it("get-header-value-trim: trim + свиване на интервали дори в кавички", () => {
    const auth = signHeaders({
      method: "GET",
      host: "example.amazonaws.com",
      rawPath: "/",
      headers: [
        ["x-amz-date", "20150830T123600Z"],
        ["My-Header1", " value1 "],
        ["My-Header2", ' "a   b   c" '],
      ],
      payloadHash: EMPTY_SHA256,
      amzDate: "20150830T123600Z",
      credentials: SUITE,
    });
    expect(extractSignature(auth)).toBe(
      "acc3ed3afb60bb290fc8d2dd0098b9911fcaa05412b367055dee359757a9c736",
    );
  });

  it("post-x-www-form-urlencoded: реален payload hash на тялото", () => {
    const auth = signHeaders({
      method: "POST",
      host: "example.amazonaws.com",
      rawPath: "/",
      headers: [
        ["Content-Type", "application/x-www-form-urlencoded"],
        ["x-amz-date", "20150830T123600Z"],
      ],
      payloadHash: hexSha256("Param1=value1"),
      amzDate: "20150830T123600Z",
      credentials: SUITE,
    });
    expect(extractSignature(auth)).toBe(
      "ff11897932ad3f4e8b18135d722051e5ac45fc38421b1da7b9d196a0fe09473a",
    );
  });

  it("НЕ нормализира пътя (S3 правилото)", () => {
    // Официалният вектор normalize-path/get-slashes очаква „/example/"
    // за генерична услуга — при S3 това би било ГРЕШНО. Тук се
    // доказва обратното на вектора: „//example//" остава буквално,
    // затова подписът е РАЗЛИЧЕН от този на нормализиращата реализация.
    const auth = signHeaders({
      method: "GET",
      host: "example.amazonaws.com",
      rawPath: "//example//",
      headers: [["x-amz-date", "20150830T123600Z"]],
      payloadHash: EMPTY_SHA256,
      amzDate: "20150830T123600Z",
      credentials: SUITE,
    });
    expect(extractSignature(auth)).not.toBe(
      "9a624bd73a37c9a373b5312afbebe7a714a789de108f0bdfe846570885f57e84",
    );
  });
});

describe("S3 API Reference (S3 спецификата)", () => {
  it("presigned GET: подписът в query, UNSIGNED-PAYLOAD", () => {
    const url = signQuery({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      rawPath: "/test.txt",
      amzDate: "20130524T000000Z",
      expiresIn: 86400,
      credentials: S3_DOCS,
    });
    // Целият адрес, не само подписът — редът и кодирането на query-то са
    // част от договора с S3.
    expect(url).toBe(
      "https://examplebucket.s3.amazonaws.com/test.txt" +
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
        "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
        "&X-Amz-Date=20130524T000000Z" +
        "&X-Amz-Expires=86400" +
        "&X-Amz-SignedHeaders=host" +
        "&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    );
  });

  it("header auth GET с Range", () => {
    const auth = signHeaders({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      rawPath: "/test.txt",
      headers: [
        ["range", "bytes=0-9"],
        ["x-amz-content-sha256", EMPTY_SHA256],
        ["x-amz-date", "20130524T000000Z"],
      ],
      payloadHash: EMPTY_SHA256,
      amzDate: "20130524T000000Z",
      credentials: S3_DOCS,
    });
    expect(extractSignature(auth)).toBe(
      "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("PUT на ключ с $: еднократно кодиране на пътя", () => {
    const payloadHash = hexSha256("Welcome to Amazon S3.");
    const auth = signHeaders({
      method: "PUT",
      host: "examplebucket.s3.amazonaws.com",
      rawPath: "/test$file.text",
      headers: [
        ["date", "Fri, 24 May 2013 00:00:00 GMT"],
        ["x-amz-content-sha256", payloadHash],
        ["x-amz-date", "20130524T000000Z"],
        ["x-amz-storage-class", "REDUCED_REDUNDANCY"],
      ],
      payloadHash,
      amzDate: "20130524T000000Z",
      credentials: S3_DOCS,
    });
    expect(extractSignature(auth)).toBe(
      "98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    );
  });

  it("ListObjects с query параметри", () => {
    const auth = signHeaders({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      rawPath: "/",
      query: [
        ["max-keys", "2"],
        ["prefix", "J"],
      ],
      headers: [
        ["x-amz-content-sha256", EMPTY_SHA256],
        ["x-amz-date", "20130524T000000Z"],
      ],
      payloadHash: EMPTY_SHA256,
      amzDate: "20130524T000000Z",
      credentials: S3_DOCS,
    });
    expect(extractSignature(auth)).toBe(
      "34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7",
    );
  });

  it("празна query стойност се записва като „lifecycle=“", () => {
    const auth = signHeaders({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      rawPath: "/",
      query: [["lifecycle", ""]],
      headers: [
        ["x-amz-content-sha256", EMPTY_SHA256],
        ["x-amz-date", "20130524T000000Z"],
      ],
      payloadHash: EMPTY_SHA256,
      amzDate: "20130524T000000Z",
      credentials: S3_DOCS,
    });
    expect(extractSignature(auth)).toBe(
      "fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543",
    );
  });
});

describe("R2 формата (замразени собствени вектори)", () => {
  it("presigned PUT с подписан content-type", () => {
    const url = signQuery({
      method: "PUT",
      host: R2_HOST,
      rawPath: "/nfi-files/translation/2026/dogovor-a1b2c3.pdf",
      headers: [["content-type", "application/pdf"]],
      amzDate: "20260805T120000Z",
      expiresIn: 900,
      credentials: R2,
    });
    expect(url).toContain("X-Amz-SignedHeaders=content-type%3Bhost");
    expect(url).toContain(
      "X-Amz-Signature=a157fbc41b21bae0b464403c6e85b74bcc31c062d95e276bfb0d60d6afe61af3",
    );
  });

  it("presigned GET с кирилица в ключа + response-content-disposition", () => {
    const url = signQuery({
      method: "GET",
      host: R2_HOST,
      rawPath: "/nfi-files/document/2026/фактура №5.pdf",
      query: [
        ["response-content-disposition", 'attachment; filename="faktura.pdf"'],
      ],
      amzDate: "20260805T120000Z",
      expiresIn: 300,
      credentials: R2,
    });
    // Пътят в крайния адрес е еднократно кодиран.
    expect(url).toContain(
      "/nfi-files/document/2026/%D1%84%D0%B0%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%E2%84%965.pdf",
    );
    expect(url).toContain(
      "X-Amz-Signature=793f183ea96c976d2743370da4ffeedcfc4dd2128dad3ded782df36ea9040a37",
    );
  });

  it("header auth DELETE", () => {
    const auth = signHeaders({
      method: "DELETE",
      host: R2_HOST,
      rawPath: "/nfi-files/translation/2026/dogovor-a1b2c3.pdf",
      headers: [
        ["x-amz-content-sha256", EMPTY_SHA256],
        ["x-amz-date", "20260805T120000Z"],
      ],
      payloadHash: EMPTY_SHA256,
      amzDate: "20260805T120000Z",
      credentials: R2,
    });
    expect(extractSignature(auth)).toBe(
      "f96e68a2c03392fe91081c4499e977cbe92211261d5c7a6c3bcc7f3d09ca794a",
    );
  });
});
