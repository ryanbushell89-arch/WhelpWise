import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dog, CheckCircle2, AlertTriangle, RefreshCw, Pen, X } from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractData {
  id: number;
  type: string;
  status: string;
  buyerName: string | null;
  buyerEmail: string | null;
  breederName: string;
  contractDate: string | null;
  pdfUrl: string | null;
  alreadySigned: boolean;
  signedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Puppy Purchase Agreement — Limited / Pet AKC",
  puppy_sale_main:    "Puppy Purchase Agreement — Full Registration",
  stud:               "Stud Service Agreement",
  custom:             "Contract Agreement",
};

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  function getPoint(
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getPoint(e, canvas);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
    setHasSignature(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  return (
    <div className="space-y-2">
      <div className="relative bg-white rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          className="w-full touch-none cursor-crosshair block"
          style={{ height: "180px" }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Pen className="h-4 w-4" /> Draw your signature here
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Use your mouse or finger to sign above</p>
        {hasSignature && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Already Signed State ─────────────────────────────────────────────────────

function AlreadySigned({ contract }: { contract: ContractData }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-2">
        <Dog className="h-6 w-6 text-[#2d6a4f]" />
        <span className="text-xl font-bold text-[#2d6a4f] font-serif">WhelpWise</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2">Already Signed</h1>
          <p className="text-gray-600 mb-1">
            This document was signed by <strong>{contract.buyerName}</strong>
          </p>
          {contract.signedAt && (
            <p className="text-gray-500 text-sm">
              on {format(new Date(contract.signedAt), "d MMMM yyyy 'at' h:mm a")}
            </p>
          )}
          <p className="text-gray-400 text-sm mt-4">
            If you need a copy, contact {contract.breederName}.
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function SigningSuccess({ contract, signedAt }: { contract: ContractData; signedAt: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-2">
        <Dog className="h-6 w-6 text-[#2d6a4f]" />
        <span className="text-xl font-bold text-[#2d6a4f] font-serif">WhelpWise</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold font-serif mb-2">Document Signed</h1>
          <p className="text-gray-600 mb-1">
            Thank you, <strong>{contract.buyerName?.split(" ")[0]}</strong>.
            Your signature has been recorded.
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Signed on {format(new Date(signedAt), "d MMMM yyyy 'at' h:mm a")}
          </p>
          <div className="bg-gray-100 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1">
            <p><strong>Document:</strong> {TYPE_LABELS[contract.type] ?? contract.type}</p>
            <p><strong>Breeder:</strong> {contract.breederName}</p>
          </div>
          <p className="text-gray-400 text-xs mt-6">
            {contract.breederName} will receive a notification that you've signed.
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Main Signing Page ────────────────────────────────────────────────────────

export default function SigningPage() {
  const [, params] = useRoute("/sign/:token");
  const token = params?.token ?? "";

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  const { data: contract, isLoading, error } = useQuery<ContractData>({
    queryKey: ["signing", token],
    queryFn: () =>
      fetch(`/api/contracts/sign/${token}`).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error ?? r.statusText)));
        return r.json();
      }),
    enabled: !!token,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
      fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData }),
      }).then((r) => r.json()),
    onSuccess: (result) => {
      setSignedAt(result.signedAt);
    },
  });

  const canSubmit = !!signatureData && agreed && !submit.isPending;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-2">
          <Dog className="h-6 w-6 text-[#2d6a4f]" />
          <span className="text-xl font-bold text-[#2d6a4f] font-serif">WhelpWise</span>
        </header>
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !contract) {
    const msg = (error as Error)?.message ?? "This signing link is invalid or has expired.";
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-2">
          <Dog className="h-6 w-6 text-[#2d6a4f]" />
          <span className="text-xl font-bold text-[#2d6a4f] font-serif">WhelpWise</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Link Unavailable</h1>
            <p className="text-gray-600 text-sm">{msg}</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Already signed ───────────────────────────────────────────────────────────
  if (contract.alreadySigned && !signedAt) {
    return <AlreadySigned contract={contract} />;
  }

  // ── Just signed ──────────────────────────────────────────────────────────────
  if (signedAt) {
    return <SigningSuccess contract={contract} signedAt={signedAt} />;
  }

  const contractTitle = TYPE_LABELS[contract.type] ?? "Contract Agreement";

  // ── Main signing UI ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Dog className="h-6 w-6 text-[#2d6a4f]" />
          <span className="text-xl font-bold text-[#2d6a4f] font-serif">WhelpWise</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Secure Document Signing</p>
          <p className="text-xs font-medium text-gray-600 truncate max-w-48">{contract.breederName}</p>
        </div>
      </header>

      <main className="flex-1 py-8 px-4 max-w-4xl mx-auto w-full space-y-6">
        {/* Document info */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#2d6a4f]/10 flex items-center justify-center flex-shrink-0">
              <Dog className="h-6 w-6 text-[#2d6a4f]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold font-serif leading-tight">{contractTitle}</h1>
              <p className="text-gray-600 text-sm mt-0.5">
                From <strong>{contract.breederName}</strong>
                {contract.contractDate ? ` · Dated ${format(new Date(contract.contractDate), "d MMMM yyyy")}` : ""}
              </p>
              {contract.buyerName && (
                <p className="text-gray-500 text-sm mt-0.5">Signing as <strong>{contract.buyerName}</strong></p>
              )}
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Document</h2>
            {contract.pdfUrl && !pdfError && (
              <a
                href={contract.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2d6a4f] hover:underline"
              >
                Open in new tab
              </a>
            )}
          </div>

          {!contract.pdfUrl || pdfError ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">Document could not be loaded.</p>
              {!pdfError && contract.pdfUrl && (
                <Button variant="outline" size="sm" onClick={() => setPdfError(false)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry
                </Button>
              )}
            </div>
          ) : (
            <iframe
              src={contract.pdfUrl}
              className="w-full"
              style={{ height: "65vh", minHeight: "480px" }}
              title="Contract document"
              onError={() => setPdfError(true)}
            />
          )}
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-0.5">Your Signature</h2>
            <p className="text-sm text-gray-500">
              By signing below you confirm you have read and agree to the document above.
            </p>
          </div>

          <SignatureCanvas onChange={setSignatureData} />

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
              />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors leading-relaxed">
              I confirm I have read the full document above and agree to be bound by its terms.
              I understand this constitutes a legally binding digital signature.
            </span>
          </label>

          {/* Submit */}
          <div className="pt-2">
            <Button
              className="w-full h-12 text-base bg-[#2d6a4f] hover:bg-[#245a42] text-white"
              disabled={!canSubmit}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />Submitting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Pen className="h-4 w-4" />Sign Document
                </span>
              )}
            </Button>
            {!signatureData && (
              <p className="text-xs text-gray-400 text-center mt-2">Please draw your signature above to continue</p>
            )}
            {signatureData && !agreed && (
              <p className="text-xs text-gray-400 text-center mt-2">Please tick the agreement checkbox to continue</p>
            )}
          </div>

          {submit.isError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                {(submit.error as Error)?.message ?? "Submission failed. Please try again."}
              </p>
            </div>
          )}
        </div>

        {/* Legal note */}
        <p className="text-xs text-gray-400 text-center pb-4">
          This document is securely signed via WhelpWise.
          Your signature, timestamp, and IP address are recorded as legally valid evidence
          of your agreement under applicable electronic signature laws.
        </p>
      </main>
    </div>
  );
}
