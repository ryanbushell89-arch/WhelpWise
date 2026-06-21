import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ModeToggle } from "@/components/mode-toggle";
import { useClerk, useUser } from "@clerk/react";
import { useSubscription, getTrialDaysLeft } from "@/hooks/useSubscription";
import {
  Dog,
  LayoutDashboard,
  Baby,
  HeartPulse,
  Users,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  PawPrint,
  ClipboardList,
  FileText,
  AlertCircle,
  MessageCircle,
  PiggyBank,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dogs", label: "My Kennel", icon: Dog },
  { href: "/pets", label: "Family Pets", icon: PawPrint },
  { href: "/litters", label: "Litters", icon: Baby },
  { href: "/breedings", label: "Breedings", icon: HeartPulse },
  { href: "/waiting-list", label: "Waiting List", icon: ClipboardList },
  { href: "/buyers", label: "Buyers", icon: Users },
  { href: "/budget", label: "Budgeting", icon: PiggyBank },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/stud-directory", label: "Stud Directory", icon: Search },
  { href: "/breeder/chats", label: "Owner Chats", icon: MessageCircle },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: userStatus } = useSubscription();

  const trialDaysLeft = getTrialDaysLeft(userStatus?.trialEndsAt ?? null);
  const isTrialing = userStatus?.subscriptionStatus === "trialing";

  function NavContent({ onNav }: { onNav?: () => void }) {
    return (
      <>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNav}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isTrialing && trialDaysLeft <= 3 && (
          <div className="mx-3 mb-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  {trialDaysLeft === 0 ? "Trial expires today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
                </p>
                <Link
                  href="/subscribe"
                  onClick={onNav}
                  className="text-xs text-amber-700 dark:text-amber-300 underline"
                >
                  Subscribe now
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
          {user && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user.firstName ?? user.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-muted-foreground truncate">{user.emailAddresses[0]?.emailAddress}</p>
            </div>
          )}
          <Link
            href="/settings"
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              location.startsWith("/settings")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <LogOut className="h-5 w-5" />
              Log out
            </button>
            <ModeToggle />
          </div>
        </div>
      </>
    );
  }

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex w-64 border-r bg-card flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="font-serif text-xl font-bold text-primary flex items-center gap-2">
            <Dog className="h-6 w-6" />
            WhelpWise
          </Link>
        </div>
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card flex flex-col border-r transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-border">
          <Link href="/" onClick={() => setMobileOpen(false)} className="font-serif text-xl font-bold text-primary flex items-center gap-2">
            <Dog className="h-5 w-5" />
            WhelpWise
          </Link>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavContent onNav={() => setMobileOpen(false)} />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-card flex-shrink-0 gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="font-serif text-lg font-bold text-primary flex items-center gap-1.5">
            <Dog className="h-4 w-4" />
            WhelpWise
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </div>
      </main>
    </div>
  );
}
