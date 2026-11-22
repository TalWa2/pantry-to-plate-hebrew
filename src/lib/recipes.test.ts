import { describe, expect, it } from "vitest";

import { groupRecipes, parseIngredients, RANGE_TIMER_TEXT, rangeForMinutes, type Recipe } from "./recipes";

const r = (name: string, totalMinutes: number, ingredients = ["ביצים"]): Recipe => ({
  name,
  totalMinutes,
  ingredients,
  steps: ["לבשל"],
});

describe("parseIngredients", () => {
  it("splits on commas and line breaks", () => {
    expect(parseIngredients("ביצים, עגבניות\nגבינה,\n\nטורטיות")).toEqual([
      "ביצים",
      "עגבניות",
      "גבינה",
      "טורטיות",
    ]);
  });
  it("returns nothing for empty input", () => {
    expect(parseIngredients("  ,\n ")).toEqual([]);
  });
});

describe("time ranges", () => {
  it("puts 30 minutes in the first range and 31 in the second", () => {
    expect(rangeForMinutes(30)).toBe("upTo30");
    expect(rangeForMinutes(31)).toBe("from31To60");
  });
  it("puts 60 in the second range, 61 and 90 in the third", () => {
    expect(rangeForMinutes(60)).toBe("from31To60");
    expect(rangeForMinutes(61)).toBe("from61To90");
    expect(rangeForMinutes(90)).toBe("from61To90");
  });
  it("rejects anything over 90 minutes", () => {
    expect(rangeForMinutes(91)).toBeNull();
  });
});

describe("timer headings", () => {
  it("shows 30:00 for the up-to-30 range", () => {
    expect(RANGE_TIMER_TEXT.upTo30).toBe("30:00");
  });
  it("shows 60:00 for the 31–60 range", () => {
    expect(RANGE_TIMER_TEXT.from31To60).toBe("60:00");
  });
  it("shows 90:00 for the 61–90 range", () => {
    expect(RANGE_TIMER_TEXT.from61To90).toBe("90:00");
  });
});

describe("groupRecipes", () => {
  const list = ["ביצים", "עגבניות"];

  it("shows at most three meals per range", () => {
    const groups = groupRecipes([r("א", 10), r("ב", 15), r("ג", 20), r("ד", 25)], list);
    expect(groups[0]?.recipes).toHaveLength(3);
  });

  it("drops a meal that uses an ingredient not on the user's list", () => {
    const groups = groupRecipes([r("שקשוקה", 20, ["ביצים", "בצל"])], list);
    expect(groups[0]?.recipes).toHaveLength(0);
  });

  it("drops duplicate dishes", () => {
    const groups = groupRecipes([r("חביתה", 10), r("חביתה", 40)], list);
    const total = groups.reduce((n, g) => n + g.recipes.length, 0);
    expect(total).toBe(1);
  });

  it("explains a range with fewer than three meals", () => {
    const groups = groupRecipes([r("חביתה", 10)], list, { upTo30: "מעט מצרכים" });
    expect(groups[0]?.note).toBe("מעט מצרכים");
    expect(groups[1]?.note).not.toBeNull();
  });
});
