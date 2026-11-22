// Pure, browser-safe recipe rules shared by the server function, the page and tests.

export type TimeRangeId = "upTo30" | "from31To60" | "from61To90";

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

export const TIME_RANGES: { id: TimeRangeId; title: string; min: number; max: number }[] = [
  { id: "upTo30", title: "עד 30 דקות", min: 1, max: 30 },
  { id: "from31To60", title: "בין 31 ל-60 דקות", min: 31, max: 60 },
  { id: "from61To90", title: "בין 61 ל-90 דקות", min: 61, max: 90 },
];

const DEFAULT_NOTE = "לא מצאנו מספיק מנות שמתאימות לזמן הזה רק עם המצרכים שהזנת.";

/** Digits shown on the kitchen-timer illustration that heads each time range. */
export const RANGE_TIMER_TEXT: Record<TimeRangeId, string> = {
  upTo30: "30:00",
  from31To60: "60:00",
  from61To90: "90:00",
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

/** Returns the single time range a total time belongs to, or null when it is outside 1–90 minutes. */
export function rangeForMinutes(minutes: number): TimeRangeId | null {
  if (!Number.isFinite(minutes)) return null;
  const m = Math.round(minutes);
  const range = TIME_RANGES.find((r) => m >= r.min && m <= r.max);
  return range ? range.id : null;
}

/**
 * Applies the app's rules to raw suggestions: keeps only the user's ingredients,
 * drops duplicate dishes and recipes over 90 minutes, places each recipe in exactly
 * one range by total time, caps each range at three, and explains short ranges.
 */
export function groupRecipes(
  raw: Recipe[],
  userIngredients: string[],
  notes: Partial<Record<TimeRangeId, string>> = {},
): RecipeGroup[] {
  const allowed = new Map(userIngredients.map((i) => [normalize(i), i]));
  const seenNames = new Set<string>();
  const buckets: Record<TimeRangeId, Recipe[]> = { upTo30: [], from31To60: [], from61To90: [] };

  for (const r of raw) {
    const name = r.name.trim();
    const nameKey = normalize(name);
    if (!name || seenNames.has(nameKey)) continue;

    const range = rangeForMinutes(r.totalMinutes);
    if (!range) continue;

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

    const bucket = buckets[range];
    if (bucket.length >= MAX_PER_GROUP) continue;

    seenNames.add(nameKey);
    bucket.push({ name, totalMinutes: Math.round(r.totalMinutes), ingredients, steps });
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
