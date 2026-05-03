import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Star, Users, Utensils, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Recipes — Pantry Chef" },
      { name: "description", content: "Browse warm, home-cooked recipes shared by the Pantry Chef community." },
    ],
  }),
  component: Community,
});

interface PublicRecipe {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  diet: string | null;
  image_url: string | null;
  rating: number | null;
  servings: number | null;
  prep_time: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

function Community() {
  const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("saved_recipes")
        .select("id,title,description,cuisine,diet,image_url,rating,servings,prep_time,created_at,user_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) console.error(error);
      // Fetch profiles separately
      if (data) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", userIds);
        const map = new Map(profs?.map((p) => [p.user_id, p.display_name]) ?? []);
        setRecipes(data.map((r) => ({ ...r, profiles: { display_name: map.get(r.user_id) ?? "Anonymous chef" } })));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-semibold">From our community kitchen</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Recipes saved and reviewed by home cooks just like you. Find your next favorite meal.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
            <Utensils className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No community recipes yet. Be the first to share one!</p>
            <Link to="/" className="inline-block mt-4 text-primary font-medium hover:underline">Cook something →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((r) => (
              <Link
                key={r.id}
                to="/recipe/$id"
                params={{ id: r.id }}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
              >
                {r.image_url ? (
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-accent/30 flex items-center justify-center">
                    <Utensils className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    {r.cuisine && <span className="px-2 py-0.5 bg-secondary rounded-full">{r.cuisine}</span>}
                    {r.diet && r.diet !== "No restrictions" && <span className="px-2 py-0.5 bg-accent/20 rounded-full">{r.diet}</span>}
                  </div>
                  <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-primary transition">{r.title}</h3>
                  {r.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    {r.rating && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" />{r.rating}
                      </span>
                    )}
                    {r.prep_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.prep_time}</span>}
                    {r.servings && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.servings}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">by {r.profiles?.display_name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
