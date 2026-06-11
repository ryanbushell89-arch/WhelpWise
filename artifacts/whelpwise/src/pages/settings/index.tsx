import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { Settings, Bell, Palette, Database, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your WhelpWise account and preferences.</p>
      </div>

      {/* Kennel Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4" /> Kennel Profile</CardTitle>
          <CardDescription>Your kennel's public identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Kennel Name</Label>
              <Input placeholder="e.g. Goldenridge Kennels" className="mt-1.5" />
            </div>
            <div>
              <Label>Country</Label>
              <Input placeholder="e.g. United States" className="mt-1.5" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" placeholder="you@kennel.com" className="mt-1.5" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" placeholder="+1 555 000 0000" className="mt-1.5" />
            </div>
          </div>
          <Button className="mt-2">Save Profile</Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" /> Appearance</CardTitle>
          <CardDescription>Customize how WhelpWise looks.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Theme</p>
            <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <ModeToggle />
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Alert Preferences</CardTitle>
          <CardDescription>Configure which alerts appear on your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { label: "Missing daily weight entries", desc: "Alert when a puppy's weight hasn't been logged today" },
            { label: "Litter due in 3 days", desc: "Urgent alert when expected whelping is 3 days away" },
            { label: "Expiring stud listings", desc: "Alert when stud listings expire within 7 days" },
          ].map(a => (
            <div key={a.label} className="flex items-start justify-between py-2 border-b last:border-0 gap-4">
              <div>
                <div className="font-medium">{a.label}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{a.desc}</div>
              </div>
              <div className="flex-shrink-0">
                <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                  <div className="h-4 w-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Data Management</CardTitle>
          <CardDescription>Export or import your kennel data.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline">Export CSV</Button>
          <Button variant="outline">Import Data</Button>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Privacy</CardTitle>
          <CardDescription>Control your dog's public visibility.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Dog visibility is set per dog under the dog's profile (<span className="text-foreground">public</span>, <span className="text-foreground">private</span>, or <span className="text-foreground">stud-only</span>). Stud directory listings are always public.</p>
        </CardContent>
      </Card>
    </div>
  );
}
