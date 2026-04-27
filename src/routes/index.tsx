import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ChefHat, Loader2, RefreshCw, Youtube, Clock, Users, Flame, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Recipe Generator — Cook Anything With What You Have" },
      {
        name: "description",
        content:
          "Turn ingredients into delicious recipes. Pick your cuisine, diet and servings — get a full recipe, dish photo and video tutorial in seconds.",
      },
      { property: "og:title", content: "Smart Recipe Generator" },
      {
        property: "og:description",
        content:
          "AI-crafted recipes from your ingredients with photo and video tutorial.",
      },
    ],
  }),
  component: Index,
});

interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  youtubeQuery: string;
  imagePrompt: string;
}

interface RecipeResponse {
  recipe: Recipe;
  imageUrl: string | null;
  youtubeUrl: string;
}

const CUISINES = [
  "Italian", "Indian", "Mexican", "Chinese", "Japanese", "Thai",
  "French", "Mediterranean", "American", "Korean", "Middle Eastern", "Spanish",
];

const DIETS = [
  "No restrictions", "Vegetarian", "Vegan", "Gluten-free",
  "Keto", "Paleo", "Pescatarian", "Dairy-free",
];

function Index() {
  const [ingredients, setIngredients] = useState("");
  const [diet, setDiet] = useState("No restrictions");
  const [cuisine, setCuisine] = useState("Italian");
  const [servings, setServings] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);

  async function generate(avoidTitle?: string) {
    if (!ingredients.trim()) {
      toast.error("Please enter at least one ingredient.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<RecipeResponse>(
        "generate-recipe",
        { body: { ingredients, diet, cuisine, servings, avoidTitle } }
      );
      if (error) throw error;
      if (!data) throw new Error("No data returned");
      setResult(data);
      toast.success(avoidTitle ? "New recipe generated!" : "Recipe ready!");
    } catch (e: any) {
      console.error(e);
      const msg = e?.context?.error || e?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    generate();
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Pantry Chef</h1>
            <p className="text-xs text-muted-foreground mt-1">AI recipes from your ingredients</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 text-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Cook something <span className="text-primary italic">delicious</span>
          <br /> with what you already have.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Tell us your ingredients, diet and cuisine. We'll craft a full recipe,
          plate it visually and find a video tutorial.
        </p>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-20 grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-2xl p-6 space-y-5 h-fit lg:sticky lg:top-24 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="ing">Ingredients</Label>
            <Textarea
              id="ing"
              placeholder="e.g. chicken thighs, garlic, lemon, olive oil, rosemary"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Separate with commas.</p>
          </div>

          <div className="space-y-2">
            <Label>Dietary preference</Label>
            <Select value={diet} onValueChange={setDiet}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIETS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuisine</Label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUISINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serv">Servings</Label>
            <Input
              id="serv"
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Cooking up your recipe…</>
            ) : (
              <><ChefHat className="h-4 w-4" /> Generate Recipe</>
            )}
          </Button>
        </form>

        {/* Result */}
        <section className="min-h-[400px]">
          {!result && !loading && (
            <div className="h-full min-h-[400px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-10">
              <Utensils className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Your recipe will appear here. Fill in the form and hit generate.
              </p>
            </div>
          )}

          {loading && !result && (
            <div className="h-full min-h-[400px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center p-10">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="font-medium">Crafting your recipe…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Plating the dish and finding a video tutorial.
              </p>
            </div>
          )}

          {result && (
            <article className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {result.imageUrl && (
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={result.imageUrl}
                    alt={`Plated ${result.recipe.title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-8 space-y-6">
                <header className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-semibold">{result.recipe.title}</h2>
                  <p className="text-muted-foreground">{result.recipe.description}</p>
                </header>

                <div className="flex flex-wrap gap-3">
                  <Stat icon={<Clock className="h-4 w-4" />} label="Prep" value={result.recipe.prepTime} />
                  <Stat icon={<Flame className="h-4 w-4" />} label="Cook" value={result.recipe.cookTime} />
                  <Stat icon={<Users className="h-4 w-4" />} label="Serves" value={String(result.recipe.servings)} />
                  <Stat icon={<ChefHat className="h-4 w-4" />} label="Level" value={result.recipe.difficulty} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="default">
                    <a href={result.youtubeUrl} target="_blank" rel="noreferrer">
                      <Youtube className="h-4 w-4" /> Watch on YouTube
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generate(result.recipe.title)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Try a different recipe
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Ingredients</h3>
                    <ul className="space-y-2">
                      {result.recipe.ingredients.map((i, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{i}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Steps</h3>
                    <ol className="space-y-3">
                      {result.recipe.steps.map((s, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
