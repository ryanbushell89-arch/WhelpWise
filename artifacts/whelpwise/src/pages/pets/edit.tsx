import { useParams } from "wouter";
import { useGetPet } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PetForm, petToFormValues } from "./_form";

export default function EditPet() {
  const { id } = useParams<{ id: string }>();
  const petId = parseInt(id);
  const { data: pet, isLoading } = useGetPet(petId);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!pet) return null;
  return <PetForm mode="edit" petId={petId} initialValues={petToFormValues(pet)} />;
}
