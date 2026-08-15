import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins, Home, PlusCircle, FolderOpen, User, LogOut, BarChart3, Briefcase, Shield, GraduationCap, GraduationCap as EarnIcon, Wallet } from "lucide-react";
import { getMyManagerScope } from "@/lib/manager.functions";
import { getMyFacultyScope } from "@/lib/faculty.functions";

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isGeneral = profile?.user_type === "general";
  const earned = profile?.earned_credits ?? 0;
  const paid = profile?.paid_credits ?? 0;
  const totalCredits = earned + paid;

  const fetchScope = useServerFn(getMyManagerScope);
  const fetchFacultyScope = useServerFn(getMyFacultyScope);
  const { data: scope } = useQuery({
    queryKey: ["mgr", "scope"],
    queryFn: () => fetchScope(),
    retry: false,
    staleTime: 60_000,
  });
  const { data: facScope } = useQuery({
    queryKey: ["faculty", "scope"],
    queryFn: () => fetchFacultyScope(),
    retry: false,
    staleTime: 60_000,
  });
  const showManager = !!scope?.canAccess;
  const isAdmin = !!scope?.isAdmin;
  const isFaculty = !!facScope?.isFaculty;


  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-5">
        <Link to="/feed" className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-7 w-7" title="CampusVerify" />

          <span className="truncate font-serif text-2xl leading-none text-primary sm:text-3xl">CampusVerify</span>
          <span className="hidden font-sans text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            est. today
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
                title="Your credit balance"
                aria-label={`Credits: ${totalCredits}`}
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{totalCredits}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <div className="border-b border-foreground/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Credit balance</p>
                <p className="mt-0.5 font-serif text-2xl">{totalCredits}</p>
                <p className="text-[11px] text-muted-foreground">Total credits available</p>
              </div>
              <div className="divide-y divide-foreground/10 text-sm">
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <EarnIcon className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-medium">Earned</p>
                      <p className="text-[11px] text-muted-foreground">From answering surveys</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{earned}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-medium">Purchased</p>
                      <p className="text-[11px] text-muted-foreground">From your top-ups</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{paid}</span>
                </div>
              </div>
              <div className="flex gap-2 border-t border-foreground/10 p-3">
                {!isGeneral && (
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/feed">Earn more</Link>
                  </Button>
                )}
                <Button asChild size="sm" className="flex-1">
                  <Link to="/buy-credits">Buy credits</Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>


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
      <nav className="mx-auto flex max-w-5xl items-center justify-around border-t border-foreground/10 bg-card px-1 py-1.5 sm:hidden">
        <NavItem to="/feed" icon={<Home className="h-5 w-5" />} label="Feed" />
        <NavItem to="/polls" icon={<BarChart3 className="h-5 w-5" />} label="Polls" />
        <NavItem to="/create" icon={<PlusCircle className="h-5 w-5" />} label="Create" />
        <NavItem to="/my-surveys" icon={<FolderOpen className="h-5 w-5" />} label="Mine" />
        {showManager && <NavItem to="/manage" icon={<Briefcase className="h-5 w-5" />} label="Manage" />}
        {isFaculty && <NavItem to="/faculty" icon={<GraduationCap className="h-5 w-5" />} label="Faculty" />}
        {isAdmin && <NavItem to="/admin" icon={<Shield className="h-5 w-5" />} label="Admin" />}
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
      <nav className="mx-auto hidden max-w-5xl items-center gap-1 border-t border-foreground/10 px-5 py-2 sm:flex">
        <DesktopLink to="/feed">Feed</DesktopLink>
        <DesktopLink to="/polls">Polls</DesktopLink>
        <DesktopLink to="/create">Create survey</DesktopLink>
        <DesktopLink to="/my-surveys">My surveys</DesktopLink>
        {showManager && <DesktopLink to="/manage">Manage</DesktopLink>}
        {isFaculty && <DesktopLink to="/faculty">Faculty</DesktopLink>}
        {isAdmin && <DesktopLink to="/admin">Admin</DesktopLink>}
        <DesktopLink to="/profile">Profile</DesktopLink>
      </nav>
    </header>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-w-0 flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
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
