import { describe, expect, it } from "vitest";
import {
  PASS_RATIO,
  answersSchema,
  progressPercent,
  resolveLevel,
  resultCopy,
  scoreTest,
  type CourseLevel,
  type QuizQuestion,
} from "./level-test";

function q(
  id: string,
  level: CourseLevel,
  points = 1,
  position = 0,
): QuizQuestion {
  return {
    id,
    position,
    prompt: `Frage ${id}`,
    points,
    level,
    options: [
      { id: `${id}-a`, text: "richtig", correct: true },
      { id: `${id}-b`, text: "falsch", correct: false },
    ],
  };
}

/** Помага да се сглоби „всички верни на тези нива". */
function allCorrect(questions: QuizQuestion[]) {
  return Object.fromEntries(questions.map((item) => [item.id, `${item.id}-a`]));
}

describe("scoreTest", () => {
  const questions = [q("1", "A1"), q("2", "A1"), q("3", "A2")];

  it("брои точките и максимума", () => {
    const result = scoreTest(questions, allCorrect(questions));
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(3);
    expect(result.ratio).toBe(1);
  });

  it("непопълненият въпрос не носи точки и не гърми", () => {
    const result = scoreTest(questions, { "1": "1-a" });
    expect(result.score).toBe(1);
    expect(result.answers[1].chosenOptionId).toBeNull();
    expect(result.answers[1].correct).toBe(false);
  });

  it("подадена измислена опция не носи точки", () => {
    const result = scoreTest(questions, { "1": "изобщо-не-съществува" });
    expect(result.score).toBe(0);
    expect(result.answers[0].correct).toBe(false);
  });

  it("уважава тежестта на въпроса", () => {
    const weighted = [q("1", "A1", 3), q("2", "A1", 1)];
    const result = scoreTest(weighted, { "1": "1-a" });
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(4);
  });

  it("празен тест не дели на нула", () => {
    const result = scoreTest([], {});
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(0);
    expect(result.ratio).toBe(0);
    expect(result.resultLevel).toBe("A1");
  });

  it("разбивката по нива сумира вярно", () => {
    const result = scoreTest(questions, allCorrect(questions));
    expect(result.byLevel.A1).toEqual({ earned: 2, possible: 2 });
    expect(result.byLevel.A2).toEqual({ earned: 1, possible: 1 });
    expect(result.byLevel.C2).toEqual({ earned: 0, possible: 0 });
  });

  it("ИНВАРИАНТ: сборът по нива е равен на общия резултат", () => {
    const many = [
      q("1", "A1"),
      q("2", "A2", 2),
      q("3", "B1"),
      q("4", "B2", 3),
      q("5", "C1"),
    ];
    const result = scoreTest(many, { "1": "1-a", "2": "2-a", "4": "4-a" });
    const summed = Object.values(result.byLevel).reduce(
      (sum, bucket) => sum + bucket.earned,
      0,
    );
    expect(summed).toBe(result.score);
  });
});

describe("resolveLevel", () => {
  function buckets(entries: Partial<Record<CourseLevel, [number, number]>>) {
    const base = Object.fromEntries(
      (["A1", "A2", "B1", "B2", "C1", "C2"] as CourseLevel[]).map((level) => [
        level,
        { earned: 0, possible: 0 },
      ]),
    ) as Record<CourseLevel, { earned: number; possible: number }>;

    for (const [level, [earned, possible]] of Object.entries(entries)) {
      base[level as CourseLevel] = { earned, possible };
    }
    return base;
  }

  it("дава най-високото минато ниво", () => {
    expect(
      resolveLevel(buckets({ A1: [2, 2], A2: [2, 2], B1: [0, 2] })),
    ).toBe("A2");
  });

  it("НЕ прескача пропаднало ниво", () => {
    // Начинаещ, познал случайно един C2 въпрос, не бива да получи C2.
    expect(
      resolveLevel(
        buckets({ A1: [2, 2], A2: [0, 2], B1: [2, 2], C2: [2, 2] }),
      ),
    ).toBe("A1");
  });

  it("границата от 60% е включително", () => {
    expect(resolveLevel(buckets({ A1: [3, 5] }))).toBe("A1"); // 0.6
    expect(PASS_RATIO).toBe(0.6);
    // Под границата пада на A1 по подразбиране.
    expect(resolveLevel(buckets({ A1: [2, 5] }))).toBe("A1");
  });

  it("ниво без въпроси не прекъсва веригата", () => {
    // A2 липсва в теста — B1 пак се брои.
    expect(resolveLevel(buckets({ A1: [2, 2], B1: [2, 2] }))).toBe("B1");
  });

  it("нулев тест дава A1", () => {
    expect(resolveLevel(buckets({}))).toBe("A1");
  });

  it("минати всички нива дава C2", () => {
    expect(
      resolveLevel(
        buckets({
          A1: [1, 1],
          A2: [1, 1],
          B1: [1, 1],
          B2: [1, 1],
          C1: [1, 1],
          C2: [1, 1],
        }),
      ),
    ).toBe("C2");
  });
});

describe("answersSchema", () => {
  it("приема карта от низове", () => {
    expect(answersSchema.safeParse({ q1: "o1", q2: "o2" }).success).toBe(true);
  });

  it("отхвърля нечисти стойности", () => {
    expect(answersSchema.safeParse({ q1: 42 }).success).toBe(false);
    expect(answersSchema.safeParse({ q1: "" }).success).toBe(false);
    expect(answersSchema.safeParse("низ").success).toBe(false);
  });

  it("отхвърля прекалено дълги идентификатори", () => {
    expect(answersSchema.safeParse({ ["x".repeat(80)]: "o" }).success).toBe(
      false,
    );
  });
});

describe("resultCopy", () => {
  it("всяко ниво има заглавие и текст на немски", () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as CourseLevel[]) {
      const copy = resultCopy(level);
      expect(copy.headline).toBeTruthy();
      expect(copy.body).toBeTruthy();
    }
  });
});

describe("progressPercent", () => {
  it("смята процента", () => {
    expect(progressPercent(0, 10)).toBe(0);
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(10, 10)).toBe(100);
  });

  it("не дели на нула", () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(3, 0)).toBe(0);
  });
});
