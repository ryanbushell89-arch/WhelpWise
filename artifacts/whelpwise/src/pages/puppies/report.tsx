import { useRoute, Link } from "wouter";
import {
  useGetPuppy, useListWeights, useGetLitter,
  useListWorming, useListVaccinations, useListPuppyDocuments,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";

export default function PuppyReport() {
  const [, params] = useRoute("/puppies/:id/report");
  const puppyId = parseInt(params?.id ?? "0", 10);

  const { data: puppy, isLoading } = useGetPuppy(puppyId);
  const { data: weights } = useListWeights(puppyId);
  const { data: litter } = useGetLitter((puppy as any)?.litterId ?? 0, { query: { enabled: !!(puppy as any)?.litterId, queryKey: ["litter", (puppy as any)?.litterId] } });
  const { data: worming } = useListWorming(puppyId);
  const { data: vaccinations } = useListVaccinations(puppyId);
  const { data: documents } = useListPuppyDocuments(puppyId);

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full rounded-xl" /></div>;
  if (!puppy) return <div className="p-8 text-muted-foreground">Puppy not found.</div>;

  const p = puppy as any;
  const l = litter as any;
  const ws = (weights as any[]) ?? [];
  const wormingList = (worming as any[]) ?? [];
  const vaccList = (vaccinations as any[]) ?? [];
  const docList = (documents as any[]) ?? [];

  const eyeCerts = docList.filter((d: any) => d.docType === "eye_cert");
  const parentageCerts = docList.filter((d: any) => d.docType === "parentage_cert");
  const otherDocs = docList.filter((d: any) => d.docType === "other");

  const puppyLabel = p.name ?? (p.collarColour ? `${p.collarColour} Collar` : `Puppy #${puppyId}`);

  return (
    <>
      {/* Print toolbar — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/puppies/${puppyId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h2 className="font-semibold text-sm flex-1">Whelping Report — {puppyLabel}</h2>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
        </Button>
      </div>

      {/* Print document */}
      <div className="max-w-2xl mx-auto p-8 space-y-6 print:p-4 print:space-y-4 text-sm">

        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold font-serif">Puppy Whelping Report</h1>
          <p className="text-muted-foreground text-sm mt-1">Prepared for new owner</p>
        </div>

        {/* Puppy Summary */}
        <section>
          <h2 className="font-bold text-base border-b pb-1 mb-3">Puppy Information</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Identifier" value={puppyLabel} />
            {(p as any).callName && <Row label="Call Name" value={(p as any).callName} />}
            {(p as any).registeredName && <Row label="Registered Name" value={(p as any).registeredName} />}
            <Row label="Sex" value={<span className="capitalize">{p.sex}</span>} />
            {p.colour && <Row label="Coat Colour" value={p.colour} />}
            {p.markings && <Row label="Markings" value={p.markings} />}
            {p.birthWeight && <Row label="Birth Weight" value={`${p.birthWeight}g`} />}
            {p.birthTime && <Row label="Birth Time" value={p.birthTime} />}
            {l?.damName && <Row label="Dam" value={l.damName} />}
            {l?.sireName && <Row label="Sire" value={l.sireName} />}
            {l?.dob && <Row label="Date of Birth" value={format(new Date(l.dob), "d MMMM yyyy")} />}
          </div>
        </section>

        {/* Daily Weights Day 1–14 */}
        <section>
          <h2 className="font-bold text-base border-b pb-1 mb-3">Daily Weight Record</h2>
          {ws.length === 0 ? (
            <p className="text-muted-foreground italic">No weight entries recorded.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold">Day</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Date</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Weight (g)</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Change</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ws.slice(0, 14).map((w: any, i: number) => {
                  const prev = i > 0 ? ws[i - 1] : null;
                  const change = prev ? w.weightGrams - prev.weightGrams : null;
                  return (
                    <tr key={w.id} className={`border-b ${w.alertTriggered ? "bg-red-50" : ""}`}>
                      <td className="py-1.5 px-2 font-medium">Day {i + 1}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{format(new Date(w.date), "d MMM yyyy")}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{w.weightGrams}</td>
                      <td className="py-1.5 px-2 text-right">
                        {change !== null ? (
                          <span className={change < 0 ? "text-red-600 font-medium" : "text-green-700"}>
                            {change >= 0 ? "+" : ""}{change}g{w.alertTriggered ? " ⚠" : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground text-xs">{w.notes ?? ""}</td>
                    </tr>
                  );
                })}
                {ws.length > 14 && (
                  <tr>
                    <td colSpan={5} className="py-1.5 px-2 text-xs text-muted-foreground italic">
                      + {ws.length - 14} additional entries not shown (Days 15–{ws.length})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        {/* Worming */}
        <section>
          <h2 className="font-bold text-base border-b pb-1 mb-3">Worming Record</h2>
          {wormingList.length === 0 ? (
            <p className="text-muted-foreground italic">No worming treatments recorded.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold">Date</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Product</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Dose</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {wormingList.map((w: any) => (
                  <tr key={w.id} className="border-b">
                    <td className="py-1.5 px-2">{format(new Date(w.date), "d MMM yyyy")}</td>
                    <td className="py-1.5 px-2 font-medium">{w.product}</td>
                    <td className="py-1.5 px-2">{w.dose ?? "—"}</td>
                    <td className="py-1.5 px-2 text-muted-foreground text-xs">{w.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Vaccinations */}
        <section>
          <h2 className="font-bold text-base border-b pb-1 mb-3">Vaccination Record</h2>
          {vaccList.length === 0 ? (
            <p className="text-muted-foreground italic">No vaccinations recorded.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 font-semibold">Date</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Vaccine</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Batch/Lot</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Vet</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Next Due</th>
                </tr>
              </thead>
              <tbody>
                {vaccList.map((v: any) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-1.5 px-2">{format(new Date(v.date), "d MMM yyyy")}</td>
                    <td className="py-1.5 px-2 font-medium">{v.vaccineName}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{v.batchLot ?? "—"}</td>
                    <td className="py-1.5 px-2">{v.vet ?? "—"}</td>
                    <td className="py-1.5 px-2">{v.nextDueDate ? format(new Date(v.nextDueDate), "d MMM yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Eye Certifications */}
        {eyeCerts.length > 0 && (
          <section>
            <h2 className="font-bold text-base border-b pb-1 mb-3">Eye Certification</h2>
            <ul className="space-y-1">
              {eyeCerts.map((d: any) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">— {format(new Date(d.createdAt), "d MMM yyyy")}</span>
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs print:hidden">View</a>
                  <span className="print:inline hidden text-xs text-muted-foreground">Certificate on file</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Parentage Verification */}
        {parentageCerts.length > 0 && (
          <section>
            <h2 className="font-bold text-base border-b pb-1 mb-3">Parentage Verification</h2>
            <ul className="space-y-1">
              {parentageCerts.map((d: any) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">— {format(new Date(d.createdAt), "d MMM yyyy")}</span>
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs print:hidden">View</a>
                  <span className="print:inline hidden text-xs text-muted-foreground">Certificate on file</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <section>
            <h2 className="font-bold text-base border-b pb-1 mb-3">Additional Documents</h2>
            <ul className="space-y-1">
              {otherDocs.map((d: any) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">— {format(new Date(d.createdAt), "d MMM yyyy")}</span>
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs print:hidden">View</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Signature block */}
        <section className="border-t pt-4 mt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-400 mb-1 h-8" />
              <p className="text-xs text-muted-foreground">Breeder Signature &amp; Date</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-1 h-8" />
              <p className="text-xs text-muted-foreground">New Owner Signature &amp; Date</p>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Generated by WhelpWise · {format(new Date(), "d MMMM yyyy")}
          </p>
        </section>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm; }
          body { font-size: 12px; }
          .print\\:hidden { display: none !important; }
          .print\\:inline { display: inline !important; }
        }
      `}</style>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-[120px]">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
