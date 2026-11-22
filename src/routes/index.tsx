import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { AlertCircle, ChefHat, Clock, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseIngredients, RANGE_TIMER_TEXT, type RecipeGroup, type TimeRangeId } from "@/lib/recipes";
import { suggestRecipes } from "@/lib/recipes.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "מה יש במקרר? – רעיונות למנות ממה שיש בבית" },
      {
        name: "description",
        content: "כותבים אילו מצרכים יש בבית ומקבלים עד תשע הצעות למנות, מחולקות לפי זמן הכנה.",
      },
      { property: "og:title", content: "מה יש במקרר?" },
      {
        property: "og:description",
        content: "רעיונות למנות מהמצרכים שכבר יש לכם בבית – עד 30, 60 או 90 דקות.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const RANGE_STYLE: Record<TimeRangeId, { badge: string; glow: string }> = {
  upTo30: { badge: "bg-herb-soft text-accent-foreground", glow: "text-primary" },
  from31To60: { badge: "bg-saffron-soft text-foreground", glow: "text-saffron" },
  from61To90: { badge: "bg-tomato-soft text-foreground", glow: "text-tomato" },
};

function Index() {
  const suggest = useServerFn(suggestRecipes);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<RecipeGroup[] | null>(null);

  async function run() {
    const ingredients = parseIngredients(text);
    if (ingredients.length === 0) {
      setValidation("כדי שנוכל להציע משהו, צריך להזין לפחות מצרך אחד.");
      return;
    }
    setValidation(null);
    setError(null);
    setLoading(true);
    try {
      const result = await suggest({ data: { ingredients } });
      if (result.ok) {
        setGroups(result.groups);
      } else {
        setError(result.error);
      }
    } catch {
      setError("משהו השתבש ולא הצלחנו להציע מנות. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!loading) void run();
  }

  const total = groups?.reduce((n, g) => n + g.recipes.length, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:pt-16">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-cook">
          <ChefHat className="size-9" aria-hidden />
        </div>
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">מה יש במקרר?</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          כתבו מה יש לכם בבית, ואנחנו נציע מה אפשר לבשל עם זה.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-2xl rounded-3xl border bg-card p-5 shadow-card sm:p-7"
      >
        <label htmlFor="ingredients" className="mb-2 block font-medium text-foreground">
          המצרכים שלי
        </label>
        <Textarea
          id="ingredients"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (validation) setValidation(null);
          }}
          placeholder="ביצים, עגבניות, גבינה, טורטיות"
          rows={4}
          aria-invalid={validation ? true : undefined}
          aria-describedby="ingredients-hint"
          className="min-h-28 rounded-2xl bg-background px-4 py-3 text-base md:text-base"
        />
        <p id="ingredients-hint" className="mt-2 text-sm text-muted-foreground">
          אפשר להפריד בפסיקים או בשורות חדשות.
        </p>
        {validation && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" aria-hidden />
            {validation}
          </p>
        )}
        <Button type="submit" variant="cook" size="xl" disabled={loading} className="mt-5 w-full">
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              מחפשים מה אפשר להכין…
            </>
          ) : (
            "תציע לי מה להכין"
          )}
        </Button>
      </form>

      <section aria-live="polite" className="mt-12">
        {loading && (
          <p className="text-center text-lg text-muted-foreground">מחפשים מה אפשר להכין…</p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-destructive/30 bg-tomato-soft p-6 text-center"
          >
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertCircle className="size-5" aria-hidden />
              {error}
            </p>
            <Button type="button" variant="outline" onClick={() => void run()}>
              <RotateCcw aria-hidden />
              נסו שוב
            </Button>
          </div>
        )}

        {!loading && !error && groups && total === 0 && (
          <p className="mx-auto max-w-2xl rounded-3xl border bg-card p-6 text-center text-muted-foreground">
            לא מצאנו מנות שאפשר להכין רק עם המצרכים האלה. נסו להוסיף עוד כמה מצרכים.
          </p>
        )}

        {!loading && !error && groups && total > 0 && (
          <div className="space-y-12">
            {groups.map((group) => (
              <TimeGroup key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/** Static digital kitchen-timer illustration that heads a time range. */
function TimerDisplay({ rangeId, label }: { rangeId: TimeRangeId; label: string }) {
  const style = RANGE_STYLE[rangeId];
  return (
    <div
      role="img"
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-2xl border-2 border-foreground/15 bg-foreground px-4 py-2 shadow-card"
    >
      <Clock className="size-5 text-background/70" aria-hidden />
      <span
        aria-hidden
        dir="ltr"
        className={`font-mono text-2xl font-bold tabular-nums tracking-widest sm:text-3xl ${style.glow}`}
      >
        {RANGE_TIMER_TEXT[rangeId]}
      </span>
    </div>
  );
}

function TimeGroup({ group }: { group: RecipeGroup }) {
  const style = RANGE_STYLE[group.id];
  return (
    <div className="fade-up">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TimerDisplay rangeId={group.id} label={group.title} />
        <span className="text-sm text-muted-foreground">
          {group.recipes.length === 0 ? "אין הצעות" : `${group.recipes.length} הצעות`}
        </span>
      </div>
      {group.note && (
        <p className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {group.note}
        </p>
      )}
      {group.recipes.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {group.recipes.map((recipe) => (
            <article
              key={recipe.name}
              className="flex flex-col rounded-3xl border bg-card p-5 text-card-foreground shadow-card"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold leading-snug">{recipe.name}</h3>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${style.badge}`}
                >
                  <Clock className="size-4" aria-hidden />
                  {recipe.totalMinutes} דק׳
                </span>
              </div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">מצרכים מהרשימה שלך</h4>
              <ul className="mb-4 flex flex-wrap gap-2">
                {recipe.ingredients.map((ing) => (
                  <li key={ing} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                    {ing}
                  </li>
                ))}
              </ul>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">אופן ההכנה</h4>
              <ol className="list-decimal space-y-1.5 ps-5 leading-relaxed marker:font-semibold marker:text-primary">
                {recipe.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
