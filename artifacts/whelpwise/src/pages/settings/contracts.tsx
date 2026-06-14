import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, Loader2, FileText, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractTemplate {
  id: number;
  name: string;
  category: string;
  description: string | null;
  fileUrl: string;
  fileSize: number | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  puppy_sale_limited: "Limited / Pet AKC",
  puppy_sale_main:    "Full / Main Registration",
  stud:               "Stud Service",
  custom:             "Custom",
};

const CATEGORY_COLORS: Record<string, string> = {
  puppy_sale_limited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  puppy_sale_main:    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  stud:               "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  custom:             "bg-muted text-muted-foreground",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const TEMPLATES_KEY = ["contract-templates"] as const;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Upload field ─────────────────────────────────────────────────────────────

function TemplateUploadField({ onUploaded }: { onUploaded: (url: string, size: number) => void }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (r) => {
      onUploaded(`/api/storage${r.objectPath}`, (r as any).metadata?.size ?? 0);
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  return (
    <label
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer
        hover:bg-muted/50 transition-colors text-sm text-muted-foreground
        ${isUploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50"}`}
    >
      {isUploading
        ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
        : <><Upload className="h-4 w-4" />Click to upload PDF template</>
      }
      <input
        type="file"
        className="sr-only"
        accept=".pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
        }}
      />
    </label>
  );
}

// ─── Inline rename row ────────────────────────────────────────────────────────

function TemplateRow({ template, onDelete }: { template: ContractTemplate; onDelete: (id: number) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [editDesc, setEditDesc] = useState(template.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiFetch(`/api/contract-templates/${template.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      setEditing(false);
      toast({ title: "Template updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function saveEdit() {
    if (!editName.trim()) return;
    update.mutate({ name: editName.trim(), description: editDesc.trim() });
  }

  return (
    <div className="border rounded-xl p-4 bg-card hover:border-primary/30 transition-colors">
      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom}`}>
                {CATEGORY_LABELS[template.category] ?? template.category}
              </span>
              {template.fileSize && (
                <span className="text-xs text-muted-foreground">{formatBytes(template.fileSize)}</span>
              )}
            </div>
            <p className="font-semibold text-sm">{template.name}</p>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Added {format(new Date(template.createdAt), "d MMM yyyy")}
              {" · "}
              <a
                href={template.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View PDF
              </a>
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => { setEditName(template.name); setEditDesc(template.description ?? ""); setEditing(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              "{template.name}" will be removed from your library. Contracts already sent using this template are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { onDelete(template.id); setConfirmDelete(false); }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<ContractTemplate>("/api/contract-templates", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), category, description: description.trim() || null, fileUrl, fileSize }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast({ title: "Template added to library" });
      reset();
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function reset() {
    setName(""); setCategory("custom"); setDescription(""); setFileUrl(""); setFileSize(0);
  }

  function handleClose() { reset(); onClose(); }

  const canSubmit = name.trim() && fileUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contract Template</DialogTitle>
          <DialogDescription>
            Upload a PDF template to your library. You can assign it to buyers when sending contracts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Template Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Standard Puppy Purchase Agreement"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="puppy_sale_limited">Limited / Pet AKC</SelectItem>
                <SelectItem value="puppy_sale_main">Full / Main Registration</SelectItem>
                <SelectItem value="stud">Stud Service</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Any notes about when to use this template…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>PDF File <span className="text-destructive">*</span></Label>
            {fileUrl ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate text-primary">File uploaded</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setFileUrl(""); setFileSize(0); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <TemplateUploadField
                onUploaded={(url, size) => { setFileUrl(url); setFileSize(size); }}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractTemplatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data, isLoading } = useQuery<ContractTemplate[]>({
    queryKey: TEMPLATES_KEY,
    queryFn: () => apiFetch("/api/contract-templates"),
  });

  const templates = data ?? [];

  const deleteTemplate = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/contract-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast({ title: "Template removed" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings"><ArrowLeft className="h-4 w-4 mr-1" />Settings</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Contract Library</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your reusable PDF contract templates.
            Assign them to buyers from the Buyers page.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="flex-shrink-0">
          <Upload className="h-4 w-4 mr-2" />Upload Template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-2xl">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-3" />
          <h3 className="text-lg font-semibold">No templates yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-xs mx-auto">
            Upload your first PDF contract template to get started.
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />Upload your first template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onDelete={(id) => deleteTemplate.mutate(id)}
            />
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> Templates are your master copies — keep them unaltered.
          When you send a contract to a buyer, WhelpWise creates a unique instance from the template for that buyer to sign.
        </CardContent>
      </Card>

      <UploadTemplateDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
