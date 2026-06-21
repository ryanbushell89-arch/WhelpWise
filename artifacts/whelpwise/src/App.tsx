import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, useSearch } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Dog, ShieldCheck, Baby, Activity, ArrowRight, CheckCircle2, Search, Loader2 } from "lucide-react";
import { useSubscription, isSubscriptionActive } from "@/hooks/useSubscription";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DogsDirectory from "@/pages/dogs/index";
import DogProfile from "@/pages/dogs/[id]";
import NewDog from "@/pages/dogs/new";
import EditDog from "@/pages/dogs/edit";
import LittersDirectory from "@/pages/litters/index";
import LitterDetail from "@/pages/litters/[id]";
import NewLitter from "@/pages/litters/new";
import PuppyProfile from "@/pages/puppies/[id]";
import PuppyReport from "@/pages/puppies/report";
import BreedingsDirectory from "@/pages/breedings/index";
import BreedingDetail from "@/pages/breedings/[id]";
import NewBreeding from "@/pages/breedings/new";
import StudDirectory from "@/pages/stud-directory/index";
import NewStudListing from "@/pages/stud-directory/new";
import BuyersDirectory from "@/pages/buyers/index";
import BuyerDetail from "@/pages/buyers/[id]";
import BudgetPage from "@/pages/budget/index";
import SettingsPage from "@/pages/settings/index";
import ContractTemplatesPage from "@/pages/settings/contracts";
import FamilyPetsDirectory from "@/pages/pets/index";
import PetProfile from "@/pages/pets/[id]";
import NewPet from "@/pages/pets/new";
import EditPet from "@/pages/pets/edit";
import WaitingListDirectory from "@/pages/waiting-list/index";
import WaitingListDetail from "@/pages/waiting-list/[id]";
import NewWaitingListEntry from "@/pages/waiting-list/new";
import EditWaitingListEntry from "@/pages/waiting-list/edit";
import ContractsDirectory from "@/pages/contracts/index";
import ContractDetail from "@/pages/contracts/[id]";
import NewContract from "@/pages/contracts/new";
import EditContract from "@/pages/contracts/edit";
import SubscribePage from "@/pages/subscribe";
import AcceptInvite from "@/pages/invite/[token]";
import SigningPage from "@/pages/sign/[token]";
import PuppyOwnerDashboard from "@/pages/puppy-owner/index";
import PuppyOwnerChat from "@/pages/puppy-owner/chat";
import BreederChats from "@/pages/breeder/chats/index";
import BreederChatDetail from "@/pages/breeder/chats/[id]";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#2d6a4f",
    colorForeground: "#1a1a1a",
    colorMutedForeground: "#6b7280",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#1a1a1a",
    colorNeutral: "#e5e7eb",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg border border-gray-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-gray-900 font-serif font-bold",
    headerSubtitle: "text-gray-500",
    socialButtonsBlockButtonText: "text-gray-700",
    formFieldLabel: "text-gray-700 font-medium",
    footerActionLink: "text-green-700 hover:text-green-800 font-medium",
    footerActionText: "text-gray-500",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-green-700",
    formFieldSuccessText: "text-green-700",
    alertText: "text-gray-700",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50",
    formButtonPrimary: "bg-green-700 hover:bg-green-800 text-white",
    formFieldInput: "border-gray-200 bg-gray-50 text-gray-900",
    footerAction: "bg-transparent",
    dividerLine: "bg-gray-200",
    alert: "border border-gray-200",
    otpCodeFieldInput: "border-gray-200",
    formFieldRow: "",
    main: "",
  },
};

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <header className="h-16 md:h-20 border-b border-border/40 px-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <Dog className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-primary font-serif">WhelpWise</h1>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">Log in</Link>
          <Button asChild>
            <Link href="/sign-up">Start Free</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground mb-6">
            The Command Centre for Breeders
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 font-serif tracking-tight leading-[1.1]">
            Professional breeding,<br /> <span className="text-primary italic">precision</span> management.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Data-dense, authoritative, and trusted. Track pedigrees, health tests, heat cycles, and litters in one beautifully crafted digital notebook.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="text-base px-8 h-14" asChild>
              <Link href="/sign-up">
                Start 7-day free trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-14" asChild>
              <Link href="/sign-in">Log in</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">7 days free · then $5.99/month incl. GST · Cancel anytime</p>
        </section>

        <section className="py-20 bg-muted/30 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold font-serif mb-4">Everything a kennel needs</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">No more spreadsheets or scattered notes. WhelpWise brings veterinary precision to your daily operations.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Dog, title: "Dog Records & Pedigrees", desc: "Track multi-generation pedigrees and comprehensive health records for every dog." },
                { icon: Activity, title: "Breeding & Cycles", desc: "Log heat cycles, progesterone readings, and track pregnancy milestones automatically." },
                { icon: Baby, title: "Litter Management", desc: "Detailed whelping records, puppy weight charts with alerts, and buyer assignments." },
                { icon: ShieldCheck, title: "Health Testing", desc: "Store certificates, log genetic test results, and ensure breeding pairs are compatible." },
                { icon: CheckCircle2, title: "Buyer Contracts", desc: "Manage deposits, final payments, and digitally track signed adoption contracts." },
                { icon: Search, title: "Stud Directory", desc: "List your available studs publicly with verified health tests and full pedigrees." },
              ].map((f, i) => (
                <div key={i} className="bg-background p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">{f.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 text-center">
          <div className="max-w-sm mx-auto bg-card border rounded-2xl p-8 shadow-sm">
            <div className="text-4xl font-bold mb-1">$5.99</div>
            <div className="text-muted-foreground mb-6">per month · incl. GST</div>
            <ul className="text-sm text-left space-y-2 mb-8">
              {["Everything included — no feature tiers", "7-day free trial", "Automatic monthly billing", "Cancel anytime"].map(t => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />{t}</li>
              ))}
            </ul>
            <Button className="w-full" asChild>
              <Link href="/sign-up">Get started free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t">
        <p>© {new Date().getFullYear()} WhelpWise. Built for professional breeders.</p>
      </footer>
    </div>
  );
}

function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { data: userStatus, isLoading } = useSubscription();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!userStatus) return;
    // Puppy owners have their own dashboard — redirect them away from breeder routes
    if (userStatus.role === "puppy_owner") {
      setLocation("/puppy-owner");
      return;
    }
    if (!isSubscriptionActive(userStatus.subscriptionStatus)) {
      setLocation("/subscribe");
    }
  }, [userStatus, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userStatus) return null;
  if (userStatus.role === "puppy_owner") return null;
  if (!isSubscriptionActive(userStatus.subscriptionStatus)) return null;

  return <>{children}</>;
}

function AppRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <SubscriptionGate>
      <SidebarLayout>
        <Component />
      </SidebarLayout>
    </SubscriptionGate>
  );
}

// Routes accessible to signed-in users regardless of subscription/role
function AuthOnlyRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return <Component />;
}

// Breeder-only sidebar routes (subscription required)
function BreederSidebarRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <SubscriptionGate>
      <SidebarLayout>
        <Component />
      </SidebarLayout>
    </SubscriptionGate>
  );
}

function HomeRedirect() {
  const { data: userStatus, isLoading } = useSubscription();

  return (
    <>
      <Show when="signed-in">
        {isLoading ? (
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : userStatus?.role === "puppy_owner" ? (
          <Redirect to="/puppy-owner" />
        ) : (
          <Redirect to="/dashboard" />
        )}
      </Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function SignInPage() {
  const search = useSearch();
  const from = new URLSearchParams(search).get("from");
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={from ? `${basePath}${from}` : `${basePath}/dashboard`}
      />
    </div>
  );
}

function SignUpPage() {
  const search = useSearch();
  const from = new URLSearchParams(search).get("from");
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={from ? `${basePath}${from}` : `${basePath}/dashboard`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to WhelpWise", subtitle: "Sign in to your kennel" } },
        signUp: { start: { title: "Create your WhelpWise account", subtitle: "Start your 7-day free trial" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          {/* Public routes */}
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/invite/:token" component={AcceptInvite} />
          <Route path="/sign/:token" component={SigningPage} />
          <Route path="/subscribe">
            <Show when="signed-in"><SubscribePage /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>

          {/* Puppy owner area — auth required, no subscription */}
          <Route path="/puppy-owner">
            <AuthOnlyRoute component={PuppyOwnerDashboard} />
          </Route>
          <Route path="/puppy-owner/chat">
            <AuthOnlyRoute component={PuppyOwnerChat} />
          </Route>

          {/* Breeder area — subscription required */}
          <Route path="/dashboard"><AppRoute component={Dashboard} /></Route>
          <Route path="/dogs"><AppRoute component={DogsDirectory} /></Route>
          <Route path="/dogs/new"><AppRoute component={NewDog} /></Route>
          <Route path="/dogs/:id/edit"><AppRoute component={EditDog} /></Route>
          <Route path="/dogs/:id"><AppRoute component={DogProfile} /></Route>
          <Route path="/litters"><AppRoute component={LittersDirectory} /></Route>
          <Route path="/litters/new"><AppRoute component={NewLitter} /></Route>
          <Route path="/litters/:id"><AppRoute component={LitterDetail} /></Route>
          <Route path="/puppies/:id/report"><AppRoute component={PuppyReport} /></Route>
          <Route path="/puppies/:id"><AppRoute component={PuppyProfile} /></Route>
          <Route path="/breedings"><AppRoute component={BreedingsDirectory} /></Route>
          <Route path="/breedings/new"><AppRoute component={NewBreeding} /></Route>
          <Route path="/breedings/:id"><AppRoute component={BreedingDetail} /></Route>
          <Route path="/pets"><AppRoute component={FamilyPetsDirectory} /></Route>
          <Route path="/pets/new"><AppRoute component={NewPet} /></Route>
          <Route path="/pets/:id/edit"><AppRoute component={EditPet} /></Route>
          <Route path="/pets/:id"><AppRoute component={PetProfile} /></Route>
          <Route path="/waiting-list"><AppRoute component={WaitingListDirectory} /></Route>
          <Route path="/waiting-list/new"><AppRoute component={NewWaitingListEntry} /></Route>
          <Route path="/waiting-list/:id/edit"><AppRoute component={EditWaitingListEntry} /></Route>
          <Route path="/waiting-list/:id"><AppRoute component={WaitingListDetail} /></Route>
          <Route path="/contracts"><AppRoute component={ContractsDirectory} /></Route>
          <Route path="/contracts/new"><AppRoute component={NewContract} /></Route>
          <Route path="/contracts/:id/edit"><AppRoute component={EditContract} /></Route>
          <Route path="/contracts/:id"><AppRoute component={ContractDetail} /></Route>
          <Route path="/stud-directory"><AppRoute component={StudDirectory} /></Route>
          <Route path="/stud-directory/new"><AppRoute component={NewStudListing} /></Route>
          <Route path="/buyers"><AppRoute component={BuyersDirectory} /></Route>
          <Route path="/buyers/:id"><AppRoute component={BuyerDetail} /></Route>
          <Route path="/budget"><AppRoute component={BudgetPage} /></Route>
          <Route path="/settings/contracts"><AppRoute component={ContractTemplatesPage} /></Route>
          <Route path="/settings"><AppRoute component={SettingsPage} /></Route>

          {/* Breeder chat area */}
          <Route path="/breeder/chats/:id"><BreederSidebarRoute component={BreederChatDetail} /></Route>
          <Route path="/breeder/chats"><BreederSidebarRoute component={BreederChats} /></Route>

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="whelpwise-theme">
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
