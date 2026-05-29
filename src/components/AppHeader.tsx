import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Home, PlusCircle, FolderOpen, User, LogOut, Zap } from "lucide-react";
import { Link as TLink } from "@tanstack/react-router";

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link to="/feed" className="flex items-baseline gap-2">
          <span className="font-serif text-3xl leading-none text-primary">CampusVerify</span>
          <span className="hidden font-sans text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            est. today
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <TLink to="/buy" className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-paper hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            {profile?.paid_credits ?? 0} paid
          </TLink>
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <Coins className="h-3.5 w-3.5" />
            {profile?.earned_credits ?? 0} earned
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="rounded-full hover:bg-secondary"
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl items-center justify-around border-t border-foreground/10 bg-card px-2 py-1.5 sm:hidden">
        <NavItem to="/feed" icon={<Home className="h-5 w-5" />} label="Feed" />
        <NavItem to="/swipe" icon={<Zap className="h-5 w-5" />} label="Swipe" />
        <NavItem to="/create" icon={<PlusCircle className="h-5 w-5" />} label="Create" />
        <NavItem to="/my-surveys" icon={<FolderOpen className="h-5 w-5" />} label="Mine" />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
      <nav className="mx-auto hidden max-w-5xl items-center gap-1 border-t border-foreground/10 px-5 py-2 sm:flex">
        <DesktopLink to="/feed">Feed</DesktopLink>
        <DesktopLink to="/swipe">Swipe</DesktopLink>
        <DesktopLink to="/create">Create survey</DesktopLink>
        <DesktopLink to="/my-surveys">My surveys</DesktopLink>
        <DesktopLink to="/profile">Profile</DesktopLink>
      </nav>
    </header>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}

function DesktopLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
    >
      {children}
    </Link>
  );
}
