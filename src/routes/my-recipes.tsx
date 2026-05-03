import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trash2, Eye, EyeOff, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/my-recipes")({
  head: () => ({ meta: [{ title: "My Recipes — Pantry Chef" }] }),
  component: MyRecipes,
});

interface Row {
  id: string; title: string; description: string | null;
  image_url: string | null; cuisine: string | null;
  is_public: boolean; rating: number | null;
}

function MyRecipes() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [user, authLoading, nav]);

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("id,title,description,image_url,cuisine,is_public,rating")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data as Row[]);
    setLoading(false);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function togglePublic(r: Row) {
    const { error } = await supabase.from("saved_recipes").update({ is_public: !r.is_public }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.is_public ? "Made private" : "Shared with community"); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Recipe deleted"); load(); }
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold mb-2">My recipe book</h1>
        <p className="text-muted-foreground mb-8">Your saved creations. Share them with the community or keep them private.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
            <Utensils className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No saved recipes yet.</p>
            <Link to="/" className="inline-block mt-4 text-primary font-medium hover:underline">Generate your first →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <Link to="/recipe/$id" params={{ id: r.id }}>
                  {r.image_url ? (
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-accent/30 flex items-center justify-center">
                      <Utensils className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </Link>
                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold">{r.title}</h3>
                  {r.cuisine && <p className="text-xs text-muted-foreground mt-1">{r.cuisine}</p>}
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => togglePublic(r)}>
                      {r.is_public ? <><Eye className="h-4 w-4" />Public</> : <><EyeOff className="h-4 w-4" />Private</>}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
