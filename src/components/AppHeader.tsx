import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Coins, Home, PlusCircle, FolderOpen, User, LogOut, GraduationCap } from "lucide-react";

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/feed" className="flex items-center gap-2 font-bold text-primary">
          <GraduationCap className="h-5 w-5" />
          <span>CampusVerify</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary sm:flex">
            <Coins className="h-3.5 w-3.5" />
            {profile?.credits ?? 0}
          </div>
          <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-3xl items-center justify-around border-t bg-card px-2 py-1 sm:hidden">
        <NavItem to="/feed" icon={<Home className="h-5 w-5" />} label="Feed" />
        <NavItem to="/create" icon={<PlusCircle className="h-5 w-5" />} label="Create" />
        <NavItem to="/my-surveys" icon={<FolderOpen className="h-5 w-5" />} label="Mine" />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
      </nav>
      <nav className="mx-auto hidden max-w-3xl items-center gap-1 border-t px-4 py-2 sm:flex">
        <DesktopLink to="/feed">Feed</DesktopLink>
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
      className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground"
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
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-primary" }}
    >
      {children}
    </Link>
  );
}
