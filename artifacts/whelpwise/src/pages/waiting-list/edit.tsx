import { useParams } from "wouter";
import { useGetWaitingListEntry } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WLForm, wlToFormValues } from "./_form";

export default function EditWaitingListEntry() {
  const { id } = useParams<{ id: string }>();
  const entryId = parseInt(id);
  const { data, isLoading } = useGetWaitingListEntry(entryId);
  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /></div>;
  if (!data) return null;
  return <WLForm mode="edit" entryId={entryId} initialValues={wlToFormValues(data)} />;
}
