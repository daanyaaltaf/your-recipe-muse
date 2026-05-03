import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ChefHat, Loader2, RefreshCw, Youtube, Clock, Users, Flame, Utensils, Heart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
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
      { title: "Pantry Chef — Warm recipes from your kitchen" },
      { name: "description", content: "Turn the ingredients you already have into a cozy, home-cooked recipe with photos, tutorials, and a community of fellow cooks." },
    ],
  }),
  component: Index,
});

interface Recipe {
  title: string; description: string;
  prepTime: string; cookTime: string; servings: number; difficulty: string;
  ingredients: string[]; steps: string[];
  youtubeQuery: string; imagePrompt: string;
}
interface RecipeResponse { recipe: Recipe; imageUrl: string | null; youtubeUrl: string }

const CUISINES = ["Italian","Indian","Mexican","Chinese","Japanese","Thai","French","Mediterranean","American","Korean","Middle Eastern","Spanish"];
const DIETS = ["No restrictions","Vegetarian","Vegan","Gluten-free","Keto","Paleo","Pescatarian","Dairy-free"];

function Index() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [ingredients, setIngredients] = useState("");
  const [diet, setDiet] = useState("No restrictions");
  const [cuisine, setCuisine] = useState("Italian");
  const [servings, setServings] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);

  async function generate(avoidTitle?: string) {
    if (!ingredients.trim()) { toast.error("Please enter at least one ingredient."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<RecipeResponse>(
        "generate-recipe",
        { body: { ingredients, diet, cuisine, servings, avoidTitle } }
      );
      if (error) throw error;
      if (!data) throw new Error("No data returned");
      setResult(data);
      toast.success(avoidTitle ? "New recipe simmering!" : "Recipe ready!");
    } catch (e: any) {
      toast.error(e?.context?.error || e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe() {
    if (!user) { toast.info("Sign in to save recipes"); nav({ to: "/auth" }); return; }
    if (!result) return;
    setSaving(true);
    const { data, error } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      title: result.recipe.title,
      description: result.recipe.description,
      prep_time: result.recipe.prepTime,
      cook_time: result.recipe.cookTime,
      servings: result.recipe.servings,
      difficulty: result.recipe.difficulty,
      cuisine, diet,
      ingredients: result.recipe.ingredients,
      steps: result.recipe.steps,
      image_url: result.imageUrl,
      youtube_url: result.youtubeUrl,
      is_public: true,
    }).select("id").single();
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved & shared with the community!");
      nav({ to: "/recipe/$id", params: { id: data.id } });
    }
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); generate(); }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-background to-accent/10 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Crafted with love, by you & AI
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Turn your pantry into <br />
            <span className="text-primary italic">something delicious.</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto text-lg">
            Tell us what's in your kitchen. We'll plate up a warm, home-style recipe — with a photo,
            video tutorial, and a place to save and share it.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-24 grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-3xl p-6 space-y-5 h-fit lg:sticky lg:top-24 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="ing">What's in your kitchen?</Label>
            <Textarea
              id="ing"
              placeholder="chicken thighs, garlic, lemon, olive oil, rosemary…"
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
              <SelectContent>{DIETS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuisine</Label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUISINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serv">Servings</Label>
            <Input id="serv" type="number" min={1} max={20} value={servings}
              onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))} />
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Cooking…</>
              : <><ChefHat className="h-4 w-4" /> Generate Recipe</>}
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            <Link to="/community" className="hover:text-primary">Or browse community recipes →</Link>
          </p>
        </form>

        {/* Result */}
        <section className="min-h-[400px]">
          {!result && !loading && (
            <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-10 bg-card/50">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Utensils className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-xs">
                Your recipe will appear here. Tell us what's in your pantry and we'll do the rest.
              </p>
            </div>
          )}

          {loading && !result && (
            <div className="h-full min-h-[400px] rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center p-10">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="font-display text-xl">Simmering something special…</p>
              <p className="text-sm text-muted-foreground mt-1">Plating the dish and finding a tutorial.</p>
            </div>
          )}

          {result && (
            <article className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
              {result.imageUrl && (
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img src={result.imageUrl} alt={`Plated ${result.recipe.title}`} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-6 md:p-8 space-y-6">
                <header className="space-y-2">
                  <h2 className="font-display text-3xl md:text-4xl font-semibold">{result.recipe.title}</h2>
                  <p className="text-muted-foreground">{result.recipe.description}</p>
                </header>

                <div className="flex flex-wrap gap-3">
                  <Stat icon={<Clock className="h-4 w-4" />} label="Prep" value={result.recipe.prepTime} />
                  <Stat icon={<Flame className="h-4 w-4" />} label="Cook" value={result.recipe.cookTime} />
                  <Stat icon={<Users className="h-4 w-4" />} label="Serves" value={String(result.recipe.servings)} />
                  <Stat icon={<ChefHat className="h-4 w-4" />} label="Level" value={result.recipe.difficulty} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={saveRecipe} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                    Save & share
                  </Button>
                  <Button variant="outline" onClick={() => window.open(result.youtubeUrl, "_blank", "noopener,noreferrer")}>
                    <Youtube className="h-4 w-4" /> Watch on YouTube
                  </Button>
                  <Button variant="ghost" onClick={() => generate(result.recipe.title)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Try another
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold mb-3">Ingredients</h3>
                    <ul className="space-y-2">
                      {result.recipe.ingredients.map((i, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-primary mt-1">•</span><span>{i}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold mb-3">Steps</h3>
                    <ol className="space-y-3">
                      {result.recipe.steps.map((s, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{idx + 1}</span>
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
