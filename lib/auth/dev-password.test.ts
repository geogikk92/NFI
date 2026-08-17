// Пази паролата за разработка от РАЗМИНАВАНЕ между двата пакета проверки.
//
// e2e/_harness.mjs е обикновен .mjs и не може да внесе TypeScript, тоест
// там стойността е преписана. Това е единственото копие — и точно то се
// разминава. На 17.08.2026 семейството изглеждаше така:
//
//   prisma/seed.ts                        „1"
//   lib/auth/login-db.integration.test.ts „1"
//   e2e/_harness.mjs                      „nfi-lokalna-parola"
//
// Резултатът беше, че двата пакета се ИЗКЛЮЧВАТ взаимно: каквото и да има
// в базата, единият пада. И то не с ясно съобщение, а с „вярна парола не
// праща към /admin" — тоест изглежда като счупен вход. Отне час.
//
// Оттук нататък разминаването пада този тест за секунди.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEV_PASSWORD, SEEDED_ACCOUNTS } from "./dev-password";

const harness = readFileSync(
  new URL("../../e2e/_harness.mjs", import.meta.url),
  "utf8",
);

describe("паролата за разработка е една", () => {
  it("e2e харнията ползва същата стойност като сийда", () => {
    const match = /export const DEV_PASSWORD = "([^"]*)";/.exec(harness);

    expect(
      match,
      "e2e/_harness.mjs вече не изнася DEV_PASSWORD — провери дали този " +
        "тест още пази нещо реално.",
    ).not.toBeNull();

    expect(match![1]).toBe(DEV_PASSWORD);
  });

  it("харнията ползва същите профили", () => {
    for (const email of SEEDED_ACCOUNTS) {
      expect(harness, `Липсва ${email} в e2e/_harness.mjs`).toContain(email);
    }
  });
});
