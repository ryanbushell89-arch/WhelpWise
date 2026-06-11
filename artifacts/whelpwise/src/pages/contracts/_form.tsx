import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCreateContract, useUpdateContract } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";

export interface ContractFormValues {
  type: string; status: string;
  puppyId: string; studListingId: string; waitingListId: string;
  buyerName: string; buyerEmail: string; buyerPhone: string; buyerAddress: string;
  bitchOwnerName: string; bitchOwnerEmail: string; bitchOwnerPhone: string; bitchOwnerAddress: string;
  bitchName: string; bitchRegNumber: string; bitchBreed: string;
  salePrice: string; depositAmount: string; balanceDue: string; balanceDueDate: string;
  studFee: string; studFeePaymentTerms: string;
  specialConditions: string; returnPolicy: string; healthGuarantee: string;
  templateUrl: string; signedContractUrl: string;
  notes: string; contractDate: string;
}

const empty: ContractFormValues = {
  type: "puppy_sale_limited", status: "draft",
  puppyId: "", studListingId: "", waitingListId: "",
  buyerName: "", buyerEmail: "", buyerPhone: "", buyerAddress: "",
  bitchOwnerName: "", bitchOwnerEmail: "", bitchOwnerPhone: "", bitchOwnerAddress: "",
  bitchName: "", bitchRegNumber: "", bitchBreed: "",
  salePrice: "", depositAmount: "", balanceDue: "", balanceDueDate: "",
  studFee: "", studFeePaymentTerms: "",
  specialConditions: "", returnPolicy: "", healthGuarantee: "",
  templateUrl: "", signedContractUrl: "",
  notes: "", contractDate: new Date().toISOString().slice(0, 10),
};

export function contractToFormValues(c: any): ContractFormValues {
  return {
    type: c.type ?? "puppy_sale_limited", status: c.status ?? "draft",
    puppyId: c.puppyId != null ? String(c.puppyId) : "",
    studListingId: c.studListingId != null ? String(c.studListingId) : "",
    waitingListId: c.waitingListId != null ? String(c.waitingListId) : "",
    buyerName: c.buyerName ?? "", buyerEmail: c.buyerEmail ?? "",
    buyerPhone: c.buyerPhone ?? "", buyerAddress: c.buyerAddress ?? "",
    bitchOwnerName: c.bitchOwnerName ?? "", bitchOwnerEmail: c.bitchOwnerEmail ?? "",
    bitchOwnerPhone: c.bitchOwnerPhone ?? "", bitchOwnerAddress: c.bitchOwnerAddress ?? "",
    bitchName: c.bitchName ?? "", bitchRegNumber: c.bitchRegNumber ?? "", bitchBreed: c.bitchBreed ?? "",
    salePrice: c.salePrice ?? "", depositAmount: c.depositAmount ?? "",
    balanceDue: c.balanceDue ?? "", balanceDueDate: c.balanceDueDate ?? "",
    studFee: c.studFee ?? "", studFeePaymentTerms: c.studFeePaymentTerms ?? "",
    specialConditions: c.specialConditions ?? "", returnPolicy: c.returnPolicy ?? "",
    healthGuarantee: c.healthGuarantee ?? "",
    templateUrl: c.templateUrl ?? "", signedContractUrl: c.signedContractUrl ?? "",
    notes: c.notes ?? "",
    contractDate: c.contractDate ? c.contractDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

function toBody(f: ContractFormValues, waitingListId?: number) {
  return {
    type: f.type, status: f.status,
    puppyId: f.puppyId ? parseInt(f.puppyId) : null,
    studListingId: f.studListingId ? parseInt(f.studListingId) : null,
    waitingListId: f.waitingListId ? parseInt(f.waitingListId) : (waitingListId ?? null),
    buyerName: f.buyerName.trim() || null, buyerEmail: f.buyerEmail.trim() || null,
    buyerPhone: f.buyerPhone.trim() || null, buyerAddress: f.buyerAddress.trim() || null,
    bitchOwnerName: f.bitchOwnerName.trim() || null, bitchOwnerEmail: f.bitchOwnerEmail.trim() || null,
    bitchOwnerPhone: f.bitchOwnerPhone.trim() || null, bitchOwnerAddress: f.bitchOwnerAddress.trim() || null,
    bitchName: f.bitchName.trim() || null, bitchRegNumber: f.bitchRegNumber.trim() || null,
    bitchBreed: f.bitchBreed.trim() || null,
    salePrice: f.salePrice.trim() || null, depositAmount: f.depositAmount.trim() || null,
    balanceDue: f.balanceDue.trim() || null, balanceDueDate: f.balanceDueDate || null,
    studFee: f.studFee.trim() || null, studFeePaymentTerms: f.studFeePaymentTerms.trim() || null,
    specialConditions: f.specialConditions.trim() || null, returnPolicy: f.returnPolicy.trim() || null,
    healthGuarantee: f.healthGuarantee.trim() || null,
    templateUrl: f.templateUrl || null, signedContractUrl: f.signedContractUrl || null,
    notes: f.notes.trim() || null, contractDate: f.contractDate || null,
  };
}

function FileUploadField({ label, value, onChange, accept }: {
  label: string; value: string; onChange: (url: string) => void; accept?: string;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (r) => {
      onChange(`/api/storage${r.objectPath}`);
      toast({ title: "File uploaded" });
    },
    onError: () => { toast({ title: "Upload failed", variant: "destructive" }); },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadFile(f);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {value ? (
        <div className="flex items-center gap-2">
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1">
            {value.split("/").pop()}
          </a>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onChange("")}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label className={`flex items-center gap-2 px-3 py-2 rounded-md border border-dashed cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground ${isUploading ? "opacity-60 pointer-events-none" : ""}`}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Uploading…" : "Click to upload"}
          <input type="file" className="sr-only" accept={accept ?? ".pdf,.doc,.docx"} onChange={handleFile} />
        </label>
      )}
    </div>
  );
}

export function ContractForm({ initialValues = empty, mode, contractId, waitingListId, prefill }: {
  initialValues?: ContractFormValues; mode: "create" | "edit"; contractId?: number;
  waitingListId?: number; prefill?: any;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const create = useCreateContract();
  const update = useUpdateContract();
  const [form, setForm] = useState<ContractFormValues>({ ...empty, ...initialValues });

  useEffect(() => {
    if (prefill && mode === "create") {
      setForm(f => ({
        ...f,
        waitingListId: String(prefill.id ?? ""),
        buyerName: prefill.name ?? f.buyerName,
        buyerEmail: prefill.email ?? f.buyerEmail,
        buyerPhone: prefill.phone ?? f.buyerPhone,
        buyerAddress: prefill.address ?? f.buyerAddress,
        depositAmount: prefill.depositAmount ?? f.depositAmount,
        puppyId: prefill.puppyId ? String(prefill.puppyId) : f.puppyId,
      }));
    }
  }, [prefill, mode]);

  function set(k: keyof ContractFormValues, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const isStudContract = form.type === "stud";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = toBody(form, waitingListId);
    try {
      if (mode === "create") {
        const r = await create.mutateAsync({ data: body });
        toast({ title: "Contract created" });
        navigate(`/contracts/${(r as any).id}`);
      } else if (contractId) {
        await update.mutateAsync({ contractId, data: body });
        toast({ title: "Contract saved" });
        navigate(`/contracts/${contractId}`);
      }
    } catch { toast({ title: "Failed to save contract", variant: "destructive" }); }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={mode === "edit" && contractId ? `/contracts/${contractId}` : "/contracts"}>
          <ArrowLeft className="h-4 w-4 mr-1" />{mode === "edit" ? "Back" : "Contracts"}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif">{mode === "create" ? "New Contract" : "Edit Contract"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{mode === "create" ? "Create a new sale or stud service agreement." : "Update contract details."}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type + Status */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contract Type</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="puppy_sale_limited">Puppy Sale — Limited / Pet</SelectItem>
                  <SelectItem value="puppy_sale_main">Puppy Sale — Full / Main Registration</SelectItem>
                  <SelectItem value="stud">Stud Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contract Date</Label>
              <Input type="date" value={form.contractDate} onChange={e => set("contractDate", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Buyer / Bitch Owner */}
        {!isStudContract ? (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Buyer Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Buyer Full Name</Label>
                <Input placeholder="e.g. Sarah Johnson" value={form.buyerName} onChange={e => set("buyerName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer Email</Label>
                <Input type="email" value={form.buyerEmail} onChange={e => set("buyerEmail", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer Phone</Label>
                <Input type="tel" value={form.buyerPhone} onChange={e => set("buyerPhone", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Buyer Address</Label>
                <Textarea rows={2} value={form.buyerAddress} onChange={e => set("buyerAddress", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Bitch Owner Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Bitch Owner Full Name</Label>
                <Input value={form.bitchOwnerName} onChange={e => set("bitchOwnerName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bitch Owner Email</Label>
                <Input type="email" value={form.bitchOwnerEmail} onChange={e => set("bitchOwnerEmail", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bitch Owner Phone</Label>
                <Input type="tel" value={form.bitchOwnerPhone} onChange={e => set("bitchOwnerPhone", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Bitch Owner Address</Label>
                <Textarea rows={2} value={form.bitchOwnerAddress} onChange={e => set("bitchOwnerAddress", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stud-specific bitch info */}
        {isStudContract && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Bitch Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Bitch Name</Label>
                <Input value={form.bitchName} onChange={e => set("bitchName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registration Number</Label>
                <Input placeholder="e.g. KC123456" value={form.bitchRegNumber} onChange={e => set("bitchRegNumber", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Breed</Label>
                <Input value={form.bitchBreed} onChange={e => set("bitchBreed", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked records */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Linked Records</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isStudContract && (
              <div className="space-y-1.5">
                <Label className="text-xs">Puppy ID</Label>
                <Input type="number" placeholder="e.g. 12" value={form.puppyId} onChange={e => set("puppyId", e.target.value)} />
              </div>
            )}
            {isStudContract && (
              <div className="space-y-1.5">
                <Label className="text-xs">Stud Listing ID</Label>
                <Input type="number" placeholder="e.g. 3" value={form.studListingId} onChange={e => set("studListingId", e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Waiting List Entry ID</Label>
              <Input type="number" placeholder="e.g. 5" value={form.waitingListId} onChange={e => set("waitingListId", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Financial terms */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Financial Terms</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isStudContract ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sale Price (£)</Label>
                  <Input placeholder="e.g. 1500" value={form.salePrice} onChange={e => set("salePrice", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Deposit Amount (£)</Label>
                  <Input placeholder="e.g. 250" value={form.depositAmount} onChange={e => set("depositAmount", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Balance Due (£)</Label>
                  <Input placeholder="e.g. 1250" value={form.balanceDue} onChange={e => set("balanceDue", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Balance Due Date</Label>
                  <Input type="date" value={form.balanceDueDate} onChange={e => set("balanceDueDate", e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stud Fee (£)</Label>
                  <Input placeholder="e.g. 800" value={form.studFee} onChange={e => set("studFee", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <Input placeholder="e.g. Payable on confirmation of pregnancy" value={form.studFeePaymentTerms} onChange={e => set("studFeePaymentTerms", e.target.value)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Health Guarantee</Label>
              <Textarea rows={3} placeholder="e.g. Puppy is guaranteed against hereditary defects for 24 months…" value={form.healthGuarantee} onChange={e => set("healthGuarantee", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Return Policy</Label>
              <Textarea rows={2} placeholder="e.g. Breeder agrees to take back puppy at any time if buyer cannot keep…" value={form.returnPolicy} onChange={e => set("returnPolicy", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Special Conditions</Label>
              <Textarea rows={2} placeholder="e.g. Spay/neuter required by 12 months for limited registration…" value={form.specialConditions} onChange={e => set("specialConditions", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contract Documents</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUploadField
              label="Contract Template (PDF/DOCX)"
              value={form.templateUrl}
              onChange={v => set("templateUrl", v)}
            />
            <FileUploadField
              label="Signed Contract"
              value={form.signedContractUrl}
              onChange={v => set("signedContractUrl", v)}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={3} placeholder="Any additional notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={mode === "edit" && contractId ? `/contracts/${contractId}` : "/contracts"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create Contract" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
