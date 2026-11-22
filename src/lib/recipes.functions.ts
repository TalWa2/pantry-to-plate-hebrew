import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { groupRecipes, type Recipe, type RecipeGroup, type TimeRangeId } from "./recipes";

const inputSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(60),
});

export type SuggestResult = { ok: true; groups: RecipeGroup[] } | { ok: false; error: string };

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "totalMinutes", "ingredients", "steps"],
  properties: {
    name: { type: "string" },
    totalMinutes: { type: "integer" },
    ingredients: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string" } },
  },
} as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["recipes", "notes"],
  properties: {
    recipes: { type: "array", items: recipeSchema },
    notes: {
      type: "object",
      additionalProperties: false,
      required: ["upTo30", "from31To60", "from61To90"],
      properties: {
        upTo30: { type: "string" },
        from31To60: { type: "string" },
        from61To90: { type: "string" },
      },
    },
  },
} as const;

const INSTRUCTIONS = `אתה שף ביתי מעשי. המשתמש מזין רשימת מצרכים שיש לו בבית, ואתה מציע מנות בעברית.
כללים:
- השתמש אך ורק במצרכים מהרשימה של המשתמש. אין להוסיף שום מצרך אחר — גם לא מלח, שמן, מים או תבלינים — אלא אם הם מופיעים ברשימה.
- בשדה ingredients כתוב כל מצרך בדיוק כפי שהוא מופיע ברשימה של המשתמש (אותו איות). מותר להשתמש רק בחלק מהמצרכים.
- totalMinutes הוא הזמן הכולל המשוער כולל הכנה, בישול ואפייה, במספר שלם של דקות.
- הצע עד 3 מנות שונות בכל טווח זמן: 1–30 דקות, 31–60 דקות, 61–90 דקות. סה"כ עד 9 מנות. בלי מנות כפולות או וריאציות כמעט זהות.
- השתדל להגיע ל-3 מנות בכל טווח כשזה הגיוני עם המצרכים. אל תמציא מנות לא הגיוניות רק כדי למלא טווח; אם אין מספיק מנות מתאימות, הצע פחות.
- steps: הוראות הכנה קצרות וברורות, 3–7 צעדים, בלי מספור בתוך הטקסט.
- notes: לכל טווח שיש בו פחות מ-3 מנות, כתוב משפט קצר אחד בעברית שמסביר למה יש פחות הצעות. לטווח מלא השאר מחרוזת ריקה.`;

function extractText(response: unknown): string {
  const r = response as { output_text?: unknown; output?: unknown };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  const parts: string[] = [];
  if (Array.isArray(r.output)) {
    for (const item of r.output as { type?: string; content?: unknown }[]) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const c of item.content as { type?: string; text?: unknown }[]) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("");
}

export const suggestRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SuggestResult> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: `המצרכים שיש לי בבית:\n${data.ingredients.map((i) => `- ${i}`).join("\n")}\n\nהחזר JSON לפי הסכמה.`,
          },
        ],
        text: {
          format: { type: "json_schema", name: "fridge_recipes", strict: true, schema: responseSchema },
        },
      });

      const text = extractText(response);
      const parsed = JSON.parse(text) as {
        recipes: Recipe[];
        notes: Record<TimeRangeId, string>;
      };
      return { ok: true, groups: groupRecipes(parsed.recipes ?? [], data.ingredients, parsed.notes ?? {}) };
    } catch (error) {
      if (error instanceof GatewayError) {
        console.error("AI gateway error", error.code, error.httpStatus, error.ids);
        if (error.code === "rate_limited" || error.httpStatus === 429) {
          return { ok: false, error: "יש כרגע עומס. נסו שוב בעוד רגע." };
        }
        if (error.httpStatus === 402) {
          return { ok: false, error: "השירות אינו זמין כרגע. נסו שוב מאוחר יותר." };
        }
      } else {
        console.error("Recipe suggestion failed", error);
      }
      return { ok: false, error: "משהו השתבש ולא הצלחנו להציע מנות. נסו שוב." };
    }
  });
