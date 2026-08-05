// Дневникът и медията — точно капанът от 04.08.2026, да не се върне.
//
// Тогава правилото „скрий всичко на -Id" глътна externalId и дневникът
// показваше „Без записани подробности" за реална промяна. Сега същият
// риск важи за coverMediaId: закачането на корица е нарочна промяна от
// формата и ТРЯБВА да се вижда.

import { describe, expect, it } from "vitest";
import { auditChanges, entityLabel, fieldLabel } from "./audit-log";

describe("дневникът разбира медията", () => {
  it("промяна само на coverMediaId дава ВИДИМ ред с етикет „корица“", () => {
    const changes = auditChanges({
      id: "x",
      action: "course.update",
      entity: "Course",
      entityId: "kurs1",
      actorEmail: "admin@nfi.local",
      ip: null,
      createdAt: new Date(),
      before: { coverMediaId: null },
      after: { coverMediaId: "media123" },
    });

    expect(changes).toHaveLength(1);
    expect(changes[0]?.label).toBe("корица");
  });

  it("entity Media се показва като „Файл“, не със суровото име", () => {
    expect(entityLabel("Media")).toBe("Файл");
  });

  it("полетата на Media имат човешки имена", () => {
    expect(fieldLabel("alt")).toBe("описание за екранен четец (български)");
    expect(fieldLabel("key")).toBe("ключ в хранилището");
  });

  it("uploadedById си остава скрит — никой не го е писал на ръка", () => {
    const changes = auditChanges({
      id: "x",
      action: "media.update",
      entity: "Media",
      entityId: "m1",
      actorEmail: "admin@nfi.local",
      ip: null,
      createdAt: new Date(),
      before: { uploadedById: "a" },
      after: { uploadedById: "b" },
    });

    expect(changes).toHaveLength(0);
  });
});
