import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogOut, BookHeart, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 mr-auto group">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold leading-none">Pantry Chef</h1>
            <p className="text-xs text-muted-foreground mt-1">Warm recipes, cooked together</p>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/community"><Users className="h-4 w-4" />Community</Link>
          </Button>
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-recipes"><BookHeart className="h-4 w-4" />My Recipes</Link>
            </Button>
          )}
        </nav>

        {user ? (
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />Sign out
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
