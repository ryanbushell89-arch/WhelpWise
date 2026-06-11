import { useParams } from "wouter";
import { useGetContract } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractForm, contractToFormValues } from "./_form";

export default function EditContract() {
  const { id } = useParams<{ id: string }>();
  const contractId = parseInt(id);
  const { data, isLoading } = useGetContract(contractId);
  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!data) return null;
  return <ContractForm mode="edit" contractId={contractId} initialValues={contractToFormValues(data as any)} />;
}
