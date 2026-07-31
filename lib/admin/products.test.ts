import { describe, expect, it } from "vitest";
import { productDeleteBlocker, vatCategoryProblem } from "./products";
import { VAT_CATEGORIES, PRODUCT_TYPES } from "./queries";

describe("vatCategoryProblem", () => {
  it("спира физически продукт, обявен за електронна услуга", () => {
    // Електронната услуга е такава именно защото се доставя автоматично.
    // Пратка и „без човешка намеса" не вървят заедно, а грешката тук мести
    // цялото ДДС третиране: електронните услуги минават през OSS.
    expect(vatCategoryProblem("PHYSICAL", "ELECTRONIC")).not.toBeNull();
  });

  it("спира дигитален продукт, обявен за стока", () => {
    expect(vatCategoryProblem("DIGITAL", "GOODS")).not.toBeNull();
  });

  it("ПУСКА заверен превод върху хартия", () => {
    // Истински продукт: човешки труд (значи НЕ е електронна услуга и не
    // минава през OSS), но листът пътува по пощата. Забраната на тази
    // двойка би направила услугата невъведима.
    expect(vatCategoryProblem("PHYSICAL", "TRANSLATION")).toBeNull();
  });

  it("ПУСКА и двата вида курс, макар да са с различна категория", () => {
    // Онлайн курс на живо е „обучение"; записаният видеокурс е
    // „електронна услуга". И двата са дигитални — точно затова видът не
    // определя категорията.
    expect(vatCategoryProblem("DIGITAL", "EDUCATION")).toBeNull();
    expect(vatCategoryProblem("DIGITAL", "ELECTRONIC")).toBeNull();
  });

  it("пуска обичайните двойки", () => {
    expect(vatCategoryProblem("PHYSICAL", "GOODS")).toBeNull();
    expect(vatCategoryProblem("DIGITAL", "TRANSLATION")).toBeNull();
  });

  it("забранява РОВНО две двойки от осемте", () => {
    // Пази от свиване на правилото „за всеки случай": всяка забранена
    // двойка е продукт, който не може да се въведе. Осем комбинации,
    // шест позволени.
    const blocked = [];
    for (const type of PRODUCT_TYPES) {
      for (const category of VAT_CATEGORIES) {
        if (vatCategoryProblem(type, category)) blocked.push(`${type}+${category}`);
      }
    }

    expect(blocked.sort()).toEqual(["DIGITAL+GOODS", "PHYSICAL+ELECTRONIC"]);
  });
});

describe("productDeleteBlocker", () => {
  it("пуска непродаван продукт", () => {
    expect(productDeleteBlocker({ orderItems: 0, files: 0 })).toBeNull();
    // Собствените файлове НЕ спират изтриването — те падат с продукта.
    expect(productDeleteBlocker({ orderItems: 0, files: 3 })).toBeNull();
  });

  it("спира продаван продукт и казва колко пъти", () => {
    const message = productDeleteBlocker({ orderItems: 7, files: 0 });
    expect(message).toContain("7");
    // Причината е счетоводна (ЗДДС чл. 121), затова съобщението сочи
    // фактурите, а не „ограничение в базата".
    expect(message).toContain("фактурите");
    // И предлага какво ДА се направи вместо това.
    expect(message).toContain("Спри го от продажба");
  });
});
