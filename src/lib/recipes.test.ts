import { describe, expect, it } from "vitest";

import { eligibleRanges, groupRecipes, parseIngredients, RANGE_TIMER_TEXT, type Recipe } from "./recipes";

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
  it("makes a 25-minute recipe eligible for all three groups", () => {
    expect(eligibleRanges(25)).toEqual(["upTo30", "upTo60", "upTo90"]);
  });
  it("makes a 45-minute recipe eligible for the 60 and 90 groups only", () => {
    expect(eligibleRanges(45)).toEqual(["upTo60", "upTo90"]);
  });
  it("includes the upper limit itself", () => {
    expect(eligibleRanges(30)).toEqual(["upTo30", "upTo60", "upTo90"]);
    expect(eligibleRanges(60)).toEqual(["upTo60", "upTo90"]);
    expect(eligibleRanges(90)).toEqual(["upTo90"]);
  });
  it("rejects anything over 90 minutes", () => {
    expect(eligibleRanges(91)).toEqual([]);
  });
});

describe("timer headings", () => {
  it("shows 30:00 for the up-to-30 range", () => {
    expect(RANGE_TIMER_TEXT.upTo30).toBe("30:00");
  });
  it("shows 60:00 for the up-to-60 range", () => {
    expect(RANGE_TIMER_TEXT.upTo60).toBe("60:00");
  });
  it("shows 90:00 for the up-to-90 range", () => {
    expect(RANGE_TIMER_TEXT.upTo90).toBe("90:00");
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

  it("places one dish in every group its time allows", () => {
    const groups = groupRecipes([r("חביתה", 25)], list);
    expect(groups.map((g) => g.recipes.length)).toEqual([1, 1, 1]);
  });

  it("drops duplicate dishes within a group", () => {
    const groups = groupRecipes([r("חביתה", 10), r("חביתה", 40)], list);
    for (const g of groups) {
      expect(g.recipes.map((x) => x.name)).toEqual(["חביתה"]);
    }
  });

  it("explains a range with fewer than three meals", () => {
    const groups = groupRecipes([r("חביתה", 10)], list, { upTo30: "מעט מצרכים" });
    expect(groups[0]?.note).toBe("מעט מצרכים");
    expect(groups[1]?.note).not.toBeNull();
  });
});
