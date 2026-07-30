import { describe, expect, it } from "vitest";
import {
  MIN_FILL_SECONDS,
  callRequestSchema,
  checkSpam,
} from "./call-requests";

const NOW = new Date("2026-07-30T12:00:00Z").getTime();

describe("checkSpam · honeypot", () => {
  it("попълненото скрито поле е спам", () => {
    expect(
      checkSpam({ honeypot: "http://spam.example", formRenderedAt: NOW - 10_000, now: NOW }),
    ).toEqual({ spam: true, reason: "honeypot" });
  });

  it("празното и само-интервали скрито поле не е спам", () => {
    expect(
      checkSpam({ honeypot: "", formRenderedAt: NOW - 10_000, now: NOW }).spam,
    ).toBe(false);
    expect(
      checkSpam({ honeypot: "   ", formRenderedAt: NOW - 10_000, now: NOW }).spam,
    ).toBe(false);
    expect(
      checkSpam({ honeypot: null, formRenderedAt: NOW - 10_000, now: NOW }).spam,
    ).toBe(false);
  });
});

describe("checkSpam · време за попълване", () => {
  it("под минимума е спам", () => {
    expect(
      checkSpam({ honeypot: null, formRenderedAt: NOW - 500, now: NOW }),
    ).toEqual({ spam: true, reason: "too-fast" });
  });

  it("точно на границата минава", () => {
    expect(
      checkSpam({
        honeypot: null,
        formRenderedAt: NOW - MIN_FILL_SECONDS * 1000,
        now: NOW,
      }).spam,
    ).toBe(false);
  });

  it("липсващият или повреден отпечатък е спам", () => {
    expect(checkSpam({ honeypot: null, formRenderedAt: null, now: NOW })).toEqual({
      spam: true,
      reason: "no-timestamp",
    });
    expect(
      checkSpam({ honeypot: null, formRenderedAt: Number.NaN, now: NOW }),
    ).toEqual({ spam: true, reason: "no-timestamp" });
  });

  it("стар формуляр НЕ е спам — човек е държал таба отворен", () => {
    expect(
      checkSpam({
        honeypot: null,
        formRenderedAt: NOW - 1000 * 60 * 60 * 5,
        now: NOW,
      }).spam,
    ).toBe(false);
  });
});

describe("callRequestSchema", () => {
  const valid = {
    name: "Max Mustermann",
    email: "max@example.com",
    phone: "+49 911 123456",
    message: "Ich möchte einen A1-Kurs.",
    preferredTime: "nachmittags",
    courseId: "",
    source: "CONTACT_PAGE" as const,
  };

  it("приема валидна заявка", () => {
    expect(callRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("нормализира имейла — тример и малки букви", () => {
    const parsed = callRequestSchema.parse({
      ...valid,
      email: "  MAX@Example.COM  ",
    });
    expect(parsed.email).toBe("max@example.com");
  });

  it("тримерира името", () => {
    expect(callRequestSchema.parse({ ...valid, name: "  Anna  " }).name).toBe(
      "Anna",
    );
  });

  it("иска смислено име", () => {
    expect(callRequestSchema.safeParse({ ...valid, name: "A" }).success).toBe(
      false,
    );
    expect(callRequestSchema.safeParse({ ...valid, name: "  " }).success).toBe(
      false,
    );
  });

  it("проверява имейла", () => {
    for (const email of ["без-собачка", "a@", "@b.de", ""]) {
      expect(callRequestSchema.safeParse({ ...valid, email }).success).toBe(
        false,
      );
    }
  });

  it("телефонът и съобщението са по желание", () => {
    const parsed = callRequestSchema.safeParse({
      ...valid,
      phone: "",
      message: "",
      preferredTime: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("отхвърля прекалено дълги стойности", () => {
    expect(
      callRequestSchema.safeParse({ ...valid, name: "х".repeat(200) }).success,
    ).toBe(false);
    expect(
      callRequestSchema.safeParse({ ...valid, message: "х".repeat(3000) })
        .success,
    ).toBe(false);
  });

  it("приема само познат източник", () => {
    for (const source of CALL_SOURCES_OK) {
      expect(callRequestSchema.safeParse({ ...valid, source }).success).toBe(
        true,
      );
    }
    expect(
      callRequestSchema.safeParse({ ...valid, source: "ИЗМИСЛЕН" }).success,
    ).toBe(false);
  });
});

const CALL_SOURCES_OK = ["COURSE_PAGE", "CONTACT_PAGE", "LEVEL_TEST"] as const;
