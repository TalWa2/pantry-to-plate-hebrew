// Pure, browser-safe recipe rules shared by the server function, the page and tests.

export type TimeRangeId = "upTo30" | "upTo60" | "upTo90";

export interface Recipe {
  name: string;
  totalMinutes: number;
  ingredients: string[];
  steps: string[];
}

export interface RecipeGroup {
  id: TimeRangeId;
  title: string;
  recipes: Recipe[];
  note: string | null;
}

export const MAX_PER_GROUP = 3;
export const MAX_MINUTES = 90;

export const TIME_RANGES: { id: TimeRangeId; title: string; max: number }[] = [
  { id: "upTo30", title: "עד 30 דקות", max: 30 },
  { id: "upTo60", title: "עד 60 דקות", max: 60 },
  { id: "upTo90", title: "עד 90 דקות", max: 90 },
];

const DEFAULT_NOTE = "לא מצאנו מספיק מנות שמתאימות לזמן הזה רק עם המצרכים שהזנת.";

/** Digits shown on the kitchen-timer illustration that heads each time range. */
export const RANGE_TIMER_TEXT: Record<TimeRangeId, string> = {
  upTo30: "30:00",
  upTo60: "60:00",
  upTo90: "90:00",
};

/** Splits the free-text field by commas (Latin or Arabic) and line breaks, trimming and de-duplicating. */
export function parseIngredients(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,،\n\r]+/)) {
    const item = raw.trim().replace(/\s+/g, " ");
    if (!item) continue;
    const key = normalize(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Returns every time range whose inclusive upper limit covers the given total time. */
export function eligibleRanges(minutes: number): TimeRangeId[] {
  if (!Number.isFinite(minutes)) return [];
  const m = Math.round(minutes);
  if (m < 1) return [];
  return TIME_RANGES.filter((r) => m <= r.max).map((r) => r.id);
}

/**
 * Applies the app's rules to raw suggestions: keeps only the user's ingredients,
 * drops recipes over 90 minutes, places each recipe in every range whose inclusive
 * upper limit covers its total time (a 25-minute dish can appear in all three),
 * caps each range at three different dishes, and explains short ranges.
 */
export function groupRecipes(
  raw: Recipe[],
  userIngredients: string[],
  notes: Partial<Record<TimeRangeId, string>> = {},
): RecipeGroup[] {
  const allowed = new Map(userIngredients.map((i) => [normalize(i), i]));
  const seenNames: Record<TimeRangeId, Set<string>> = {
    upTo30: new Set(),
    upTo60: new Set(),
    upTo90: new Set(),
  };
  const buckets: Record<TimeRangeId, Recipe[]> = { upTo30: [], upTo60: [], upTo90: [] };

  for (const r of raw) {
    const name = r.name.trim();
    const nameKey = normalize(name);
    if (!name) continue;

    const ranges = eligibleRanges(r.totalMinutes);
    if (ranges.length === 0) continue;

    const ingredients: string[] = [];
    let usesOutsideItem = false;
    for (const ing of r.ingredients) {
      const match = allowed.get(normalize(ing));
      if (!match) {
        usesOutsideItem = true;
        break;
      }
      if (!ingredients.includes(match)) ingredients.push(match);
    }
    if (usesOutsideItem || ingredients.length === 0) continue;

    const steps = r.steps.map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) continue;

    for (const range of ranges) {
      const bucket = buckets[range];
      if (bucket.length >= MAX_PER_GROUP || seenNames[range].has(nameKey)) continue;
      seenNames[range].add(nameKey);
      bucket.push({ name, totalMinutes: Math.round(r.totalMinutes), ingredients, steps });
    }
  }

  return TIME_RANGES.map((range) => {
    const recipes = buckets[range.id];
    const modelNote = notes[range.id]?.trim();
    return {
      id: range.id,
      title: range.title,
      recipes,
      note: recipes.length < MAX_PER_GROUP ? modelNote || DEFAULT_NOTE : null,
    };
  });
}
