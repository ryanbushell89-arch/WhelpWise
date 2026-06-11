import { useSearch } from "wouter";
import { useGetWaitingListEntry } from "@workspace/api-client-react";
import { ContractForm } from "./_form";

export default function NewContract() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const waitingListId = params.get("waitingListId") ? parseInt(params.get("waitingListId")!) : undefined;
  const { data: wlEntry } = useGetWaitingListEntry(waitingListId ?? 0, {
    query: { enabled: !!waitingListId },
  } as any);

  return (
    <ContractForm
      mode="create"
      waitingListId={waitingListId}
      prefill={wlEntry as any}
    />
  );
}
