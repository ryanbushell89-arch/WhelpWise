import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dog, MessageCircle, AlertTriangle, CheckCircle2, Calendar, Loader2,
  ShieldCheck, Scale, FileText, LogOut,
} from "lucide-react";
import { useClerk } from "@clerk/react";
import { format, parseISO } from "date-fns";

interface PuppyProfile {
  id: number;
  name: string | null;
  callName: string | null;
  sex: string;
  colour: string | null;
  markings: string | null;
  collarColour: string | null;
  photoUrl: string | null;
  birthWeight: number | null;
  birthTime: string | null;
  notes: string | null;
  litterDob: string | null;
  breed: string | null;
}

interface WeightEntry {
  id: number;
  date: string;
  weightGrams: number;
  notes: string | null;
}

interface Vaccination {
  id: number;
  date: string;
  vaccineName: string;
  nextDueDate: string | null;
  vet: string | null;
}

interface WormingRecord {
  id: number;
  date: string;
  product: string;
  dose: string | null;
}

interface HealthReminders {
  overdueVaccines: Array<{ vaccineName: string; dueDate: string | null; overdueDays: number }>;
  wormingAlerts: Array<{ lastDate: string | null; daysSinceLast: number }>;
  total: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function PuppyOwnerDashboard() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();

  const { data: meData, isLoading: meLoading } = useQuery<{ puppy: PuppyProfile }>({
    queryKey: ["puppy-owner", "me"],
    queryFn: () => apiFetch("/api/puppy-owner/me"),
  });

  const { data: weights = [] } = useQuery<WeightEntry[]>({
    queryKey: ["puppy-owner", "weights"],
    queryFn: () => apiFetch("/api/puppy-owner/weights"),
    enabled: !!meData,
  });

  const { data: vaccinations = [] } = useQuery<Vaccination[]>({
    queryKey: ["puppy-owner", "vaccinations"],
    queryFn: () => apiFetch("/api/puppy-owner/vaccinations"),
    enabled: !!meData,
  });

  const { data: wormings = [] } = useQuery<WormingRecord[]>({
    queryKey: ["puppy-owner", "worming"],
    queryFn: () => apiFetch("/api/puppy-owner/worming"),
    enabled: !!meData,
  });

  const { data: healthReminders } = useQuery<HealthReminders>({
    queryKey: ["puppy-owner", "health-reminders"],
    queryFn: () => apiFetch("/api/puppy-owner/health-reminders"),
    enabled: !!meData,
  });

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const puppy = meData?.puppy;
  const puppyName = puppy?.name ?? puppy?.callName ?? "Your Puppy";

  const weightChartData = weights.slice(-30).map((w) => ({
    date: format(parseISO(w.date), "d MMM"),
    weight: (w.weightGrams / 1000).toFixed(2),
  }));

  const latestWeight = weights[weights.length - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dog className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary font-serif">WhelpWise</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/puppy-owner/chat")}>
              <MessageCircle className="h-4 w-4 mr-1.5" /> Chat
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Health alerts banner */}
        {healthReminders && healthReminders.total > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Health reminders</p>
              {healthReminders.overdueVaccines.map((v, i) => (
                <p key={i} className="text-sm text-amber-700">
                  Vaccine due: <strong>{v.vaccineName}</strong>
                  {v.overdueDays > 0 && <> — {v.overdueDays} day{v.overdueDays !== 1 ? "s" : ""} overdue</>}
                </p>
              ))}
              {healthReminders.wormingAlerts.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">
                  {w.lastDate
                    ? <>Worming overdue — last given {w.daysSinceLast} days ago</>
                    : <>Worming: no records found</>}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Puppy profile card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              {puppy?.photoUrl ? (
                <img
                  src={puppy.photoUrl}
                  alt={puppyName}
                  className="w-20 h-20 rounded-2xl object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dog className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold font-serif">{puppyName}</h1>
                  {(healthReminders?.total ?? 0) === 0 && (
                    <Badge className="bg-green-50 text-green-700 border-green-200 border">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> All clear
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {puppy?.sex && (
                    <span className="text-sm text-muted-foreground">
                      {puppy.sex === "M" ? "Male" : puppy.sex === "F" ? "Female" : puppy.sex}
                    </span>
                  )}
                  {puppy?.colour && <span className="text-sm text-muted-foreground">· {puppy.colour}</span>}
                  {puppy?.breed && <span className="text-sm text-muted-foreground">· {puppy.breed}</span>}
                </div>
                {puppy?.litterDob && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                    Born {format(parseISO(puppy.litterDob as string), "d MMMM yyyy")}
                  </p>
                )}
                {latestWeight && (
                  <p className="text-sm font-medium mt-1">
                    <Scale className="h-3.5 w-3.5 inline mr-1 text-primary" />
                    Current weight: <strong>{(latestWeight.weightGrams / 1000).toFixed(2)} kg</strong>
                    <span className="text-muted-foreground ml-1">({format(parseISO(latestWeight.date), "d MMM")})</span>
                  </p>
                )}
              </div>
            </div>

            {puppy?.notes && (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">{puppy.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Weight chart */}
        {weightChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" /> Weight History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip formatter={(v: string) => [`${v} kg`, "Weight"]} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Vaccinations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Vaccinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vaccination records yet.</p>
              ) : (
                <div className="space-y-3">
                  {vaccinations.map((v) => (
                    <div key={v.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <p className="font-medium text-sm">{v.vaccineName}</p>
                      <p className="text-xs text-muted-foreground">
                        Given: {v.date}
                        {v.vet && ` · ${v.vet}`}
                      </p>
                      {v.nextDueDate && (
                        <p className={`text-xs mt-0.5 ${v.nextDueDate <= new Date().toISOString().split("T")[0] ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                          Next due: {v.nextDueDate}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worming */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Worming Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wormings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No worming records yet.</p>
              ) : (
                <div className="space-y-3">
                  {wormings.map((w) => (
                    <div key={w.id} className="border-b last:border-0 pb-2 last:pb-0">
                      <p className="font-medium text-sm">{w.product}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.date}
                        {w.dose && ` · ${w.dose}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Chat with your breeder</p>
              <p className="text-sm text-muted-foreground">Ask questions, get advice — everything in one place.</p>
            </div>
            <Button onClick={() => setLocation("/puppy-owner/chat")} className="flex-shrink-0">
              <MessageCircle className="h-4 w-4 mr-2" /> Open Chat
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
