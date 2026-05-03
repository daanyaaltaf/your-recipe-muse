import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Clock, Flame, Users, ChefHat, Youtube, Star, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/recipe/$id")({
  component: RecipeDetail,
});

interface Recipe {
  id: string; user_id: string; title: string; description: string | null;
  prep_time: string | null; cook_time: string | null; servings: number | null;
  difficulty: string | null; cuisine: string | null; diet: string | null;
  ingredients: string[]; steps: string[];
  image_url: string | null; youtube_url: string | null;
  notes: string | null; rating: number | null;
}

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [r, setR] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState<string>("");

  // edit-review state (owner only)
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("saved_recipes").select("*").eq("id", id).maybeSingle();
    if (error || !data) { toast.error("Recipe not found"); nav({ to: "/community" }); return; }
    const rec = data as any as Recipe;
    setR(rec);
    setEditRating(rec.rating ?? 0);
    setEditNotes(rec.notes ?? "");
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", rec.user_id).maybeSingle();
    setAuthorName(prof?.display_name ?? "Anonymous chef");
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function saveReview(e: FormEvent) {
    e.preventDefault();
    if (!r) return;
    setSaving(true);
    const { error } = await supabase.from("saved_recipes")
      .update({ rating: editRating || null, notes: editNotes || null })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Review saved!"); load(); }
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!r) return null;

  const isOwner = user?.id === r.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to community
        </Link>

        <article className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          {r.image_url && (
            <div className="aspect-[16/9] overflow-hidden bg-muted">
              <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-10 space-y-6">
            <header>
              <p className="text-sm text-muted-foreground italic">by {authorName}</p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold mt-2">{r.title}</h1>
              {r.description && <p className="text-muted-foreground mt-3 text-lg">{r.description}</p>}
            </header>

            <div className="flex flex-wrap gap-3">
              {r.prep_time && <Stat icon={<Clock className="h-4 w-4" />} label="Prep" value={r.prep_time} />}
              {r.cook_time && <Stat icon={<Flame className="h-4 w-4" />} label="Cook" value={r.cook_time} />}
              {r.servings && <Stat icon={<Users className="h-4 w-4" />} label="Serves" value={String(r.servings)} />}
              {r.difficulty && <Stat icon={<ChefHat className="h-4 w-4" />} label="Level" value={r.difficulty} />}
            </div>

            {r.youtube_url && (
              <Button onClick={() => window.open(r.youtube_url!, "_blank", "noopener,noreferrer")}>
                <Youtube className="h-4 w-4" /> Watch tutorial
              </Button>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-display text-2xl font-semibold mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {r.ingredients.map((i, idx) => (
                    <li key={idx} className="flex gap-2 text-sm"><span className="text-primary mt-1">•</span><span>{i}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold mb-3">Steps</h3>
                <ol className="space-y-3">
                  {r.steps.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{idx + 1}</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Review section */}
            <div className="border-t border-border pt-6">
              <h3 className="font-display text-2xl font-semibold mb-4">Chef's review</h3>
              {isOwner ? (
                <form onSubmit={saveReview} className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Your rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setEditRating(n)}>
                          <Star className={`h-7 w-7 transition ${n <= editRating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    placeholder="How did it turn out? Any tweaks for next time?"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                  />
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save review"}
                  </Button>
                </form>
              ) : (
                <div>
                  {r.rating ? (
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-5 w-5 ${n <= r.rating! ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  ) : null}
                  {r.notes ? (
                    <p className="text-muted-foreground italic">"{r.notes}"</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No review yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
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
